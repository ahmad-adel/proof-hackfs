import './App.css';
import React from 'react';
import {Row, Col, Card} from 'react-bootstrap';

import {CeramicClient, DEFAULT_CLIENT_CONFIG} from '@ceramicnetwork/http-client'
import {getResolver, wrapDocument} from '@ceramicnetwork/3id-did-resolver'
import { TileDocument } from '@ceramicnetwork/stream-tile'

import { EthereumAuthProvider } from '@ceramicnetwork/blockchain-utils-linking'
import { DIDDataStore } from '@glazed/did-datastore'
import { DIDSession } from '@glazed/did-session'
import { DataModel } from '@glazed/datamodel'

import LitJsSdk from 'lit-js-sdk'

import ClipLoader from "react-spinners/ClipLoader";

import modelAliases from './model.json'
import accessControlConditions from './LitAccessControl.js'

const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com")
const model = new DataModel({ ceramic, aliases: modelAliases })
const store = new DIDDataStore({ ceramic, model })

const litClient = new LitJsSdk.LitNodeClient()
const chain = 'rinkeby'

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: "",
      profiles: [],
      loading: true,
      account_found: false,
      address: "",
      authSig: null,
    }

    this.connect = this.connect.bind(this);
    this.createAccount = this.createAccount.bind(this);
    this.readAccount = this.readAccount.bind(this);
    // this.updateAccount = this.updateAccount.bind(this);
    this.addProfile = this.addProfile.bind(this);
    this.encryptData = this.encryptData.bind(this);
    this.decryptData = this.decryptData.bind(this);
  }

  async componentDidMount() {
    const [address] = await this.connect()
    const authProvider = new EthereumAuthProvider(window.ethereum, address)
    const session = new DIDSession({ authProvider })
    const did = await session.authorize()
    ceramic.did = did

    this.authSig = await LitJsSdk.checkAndSignAuthMessage({chain: chain})

    // await this.resetRegistry()

    this.setState({
      address: address
    }, () => {
      this.readAccount()
    })
  }

  async connect() {
    await litClient.connect()
    this.litNodeClient = litClient

    const addresses = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })
    return addresses
  }

  async readAccount() {

    try {
      //use the DIDDatastore to get profile data from Ceramic
      const data = await store.get('BasicProfile')

      var profileRegistryTile;
      try {
        profileRegistryTile = await model.loadTile('profileRegistry')
      } catch (ex) {
        profileRegistryTile = await model.createTile('profileRegistry', { profileStreamIds: [] })
      }
      var profileRegistry = await store.get('profileRegistry')

      var profiles = []
      for (var streamId of profileRegistry['profileStreamIds']) {
        var stream = await ceramic.loadStream(streamId);

        console.log("Content:", stream.content)

        var encryptedData = stream.content['data']
        var encryptedSymmetricKey = stream.content['key']
        var profileData = await this.decryptData(encryptedData, encryptedSymmetricKey)
        console.log(profileData)

        profiles.push(profileData)
      }

      this.setState({
        name: data.name,
        profileRegistry: profileRegistry,
        profiles: profiles,
        loading: false,
        account_found: true
      })
    } catch (error) {
      console.log('error: ', error)
      this.setState({loading: false, account_found: false})
    }
  }

  async decryptData(encryptedData, encryptedSymmetricKey) {
    console.log('encryptedData: ', encryptedData)
    var authSig = this.authSig
    const symmetricKey = await this.litNodeClient.getEncryptionKey({
      accessControlConditions,
      toDecrypt: encryptedSymmetricKey,
      chain,
      authSig,
      permanent: false,
    })

    var dataBlob = new Blob([encryptedData], {
      type: 'application/octet-stream'
    });

    const decryptedString = await LitJsSdk.decryptString(
      dataBlob,
      symmetricKey
    );

    // console.log('decryptedString: ', decryptedString)

    return decryptedString
  }


  async createAccount() {
    this.setState({loading: true})

    var updatedProfile = {
      'name': this.state.name
    }
    
    await store.merge('BasicProfile', updatedProfile)

    this.readAccount()
  }



  async addProfile() {
    this.setState({loading: true})

    var profileData = {'field': 'value'}
    var dataStr = JSON.stringify(profileData)

    var encryptedObject = await this.encryptData(dataStr)

    // var encryptedObject = {'data': encryptedString, 'key': encryptedSymmetricKey}

    console.log('encrypted profile', encryptedObject)

    var tileDocument = await TileDocument.create(ceramic, encryptedObject, null, { pin: true })
    await ceramic.pin.add(tileDocument.id)
    await this.addProfileToRegistry(tileDocument.id)
    this.readAccount()
  }

  async encryptData (dataStr) {
    var authSig = this.authSig
    const { encryptedBlob, symmetricKey } = await LitJsSdk.encryptString(dataStr);
    const encryptedSymmetricKey = await this.litNodeClient.saveEncryptionKey({
      accessControlConditions,
      symmetricKey,
      authSig,
      chain,
      permanent: false,
    });

    const encryptedString = await new Response(encryptedBlob).text()      // issue here: encryptedString value is ''

    return {
      'data': encryptedString,
      'key': LitJsSdk.uint8arrayToString(encryptedSymmetricKey, "base16")
    }
  }

  async addProfileToRegistry(streamId) {
    var profileRegistry = this.state.profileRegistry
    profileRegistry['profileStreamIds'].push(streamId.toString())
    await store.set('profileRegistry', profileRegistry)
    profileRegistry = await store.get('profileRegistry')
  }

  async resetRegistry() {
    await store.set('profileRegistry', {profileStreamIds: []})
  }

  // async updateAccount() {
  //   this.setState({loading: true})
  //   var address = this.state.address
  //   const threeIdConnect = new ThreeIdConnect()
  //   const provider = new EthereumAuthProvider(window.ethereum, address)

  //   await threeIdConnect.connect(provider)

  //   // get or create new DID for eth address
  //   const did = new DID({
  //     provider: threeIdConnect.getDidProvider(),
  //     resolver: {
  //       ...getResolver(ceramic)
  //     }
  //   })

  //   // here if no ceramic account for this eth address, ceramic prompt appears for account creation
  //   ceramic.setDID(did)
  //   await ceramic.did.authenticate()

  //   const idx = new IDX({ ceramic })

  //   var account_name = this.state.name

  //   await idx.set('basicProfile', {
  //     account_name,
  //     profiles: this.state.profiles,
  //   })

  //   this.readAccount()
  // }


  render (){
    const items = []
    if( Object.keys(this.state.profiles).length > 0 ) {
      for (const [index, profile] of this.state.profiles.entries()) {
        items.push(
          <p>{JSON.stringify(profile)}</p>
        )
      }
    }

    return (
      <div className="App">
        <Row>
          <Col sm={6} md={6} lg={6} xl={6}>
          {
            this.state.loading ? 
            <ClipLoader loading={this.loading} size={50} />
            :
          
            <div>
            {
              this.state.account_found ? 
              <div>
                { <h3>{this.state.name}</h3> }
                { this.state.profiles.length === 0 ?
                  <p>No profiles found.</p>
                  :
                  <div>
                    {items}
                  </div>
                }

                <button onClick={this.addProfile}>Add Test Profile</button>

                {/* <input placeholder="Name" onChange={e => this.setState({name: e.target.value})} />
                <button onClick={this.updateAccount}>Update Account</button> */}

              </div>

              :

            <div>
              <h4>Account not found, please create one...</h4>
              <input placeholder="Name" onChange={e => this.setState({name: e.target.value})} />
              <button onClick={this.createAccount}>Create Account</button>
            </div>
            }
            </div>
          }
          </Col>
        </Row>
      </div>
    );
  }
}

export default App;
