import './App.css';
import React from 'react';
import {Row, Col, Card} from 'react-bootstrap';

import {CeramicClient, DEFAULT_CLIENT_CONFIG} from '@ceramicnetwork/http-client'
import {getResolver, wrapDocument} from '@ceramicnetwork/3id-did-resolver'
import { TileDocument } from '@ceramicnetwork/stream-tile'


import { EthereumAuthProvider, ThreeIdConnect } from '@3id/connect'
import { DID } from 'dids'
import { IDX } from '@ceramicstudio/idx'

import ClipLoader from "react-spinners/ClipLoader";

const endpoint = "https://ceramic-clay.3boxlabs.com"

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      name: "",
      profiles: [],
      loading: true,
      account_found: false,
      address: "",
    }

    this.connect = this.connect.bind(this);
    this.createAccount = this.createAccount.bind(this);
    this.readAccount = this.readAccount.bind(this);
    this.updateAccount = this.updateAccount.bind(this);
    this.addProfile = this.addProfile.bind(this);
  }

  async componentDidMount() {
    console.log('mounting')
    const [address] = await this.connect()
    this.setState({
      address: address
    }, () => {
      this.readAccount()
    })
  }

  async connect() {
    const addresses = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })
    return addresses
  }

  async readAccount() {
    console.log('reading account')
    const ceramic = new CeramicClient(endpoint)
    const idx = new IDX({ ceramic })

    // try {   // fetch idx profile for this eth address
    const data = await idx.get(
      'basicProfile',
      `${this.state.address}@eip155:1`   // eth address and mainnet network (eip155)
    )

    console.log('before pinned streams')

    const streamIds = await ceramic.pin.ls()

    console.log('before loop')
    var profiles = []
    for (var streamId in streamIds) {
      const stream = await ceramic.loadStream(streamId)
      profiles.push(stream)
    }
    console.log('after loop')
    console.log('data: ', profiles)
    this.setState({
      name: data.account_name,
      profiles: profiles,
      loading: false,
      account_found: true
    })
    // } catch (error) {
    //   console.log('error: ', error)
    //   this.setState({loading: false, account_found: false})
    // }
  }

  async updateAccount() {
    this.setState({loading: true})
    var address = this.state.address
    const ceramic = new CeramicClient(endpoint)
    const threeIdConnect = new ThreeIdConnect()
    const provider = new EthereumAuthProvider(window.ethereum, address)

    await threeIdConnect.connect(provider)

    // get or create new DID for eth address
    const did = new DID({
      provider: threeIdConnect.getDidProvider(),
      resolver: {
        ...getResolver(ceramic)
      }
    })

    // here if no ceramic account for this eth address, ceramic prompt appears for account creation
    ceramic.setDID(did)
    await ceramic.did.authenticate()

    const idx = new IDX({ ceramic })

    var account_name = this.state.name

    await idx.set('basicProfile', {
      account_name,
      profiles: this.state.profiles,
    })

    this.readAccount()
  }

  async addProfile() {
    const ceramic = new CeramicClient(endpoint)
    var profileData = {'field': 'value'}
    await TileDocument.create(ceramic, profileData, null, { pin: true })
    this.readAccount()
  }

  async createAccount() {
    this.setState({loading: true})
    var address = this.state.address
    const ceramic = new CeramicClient(endpoint)
    const threeIdConnect = new ThreeIdConnect()
    const provider = new EthereumAuthProvider(window.ethereum, address)

    await threeIdConnect.connect(provider)

    // get or create new DID for eth address
    const did = new DID({
      provider: threeIdConnect.getDidProvider(),
      resolver: {
        ...getResolver(ceramic)
      }
    })

    // here if no ceramic account for this eth address, ceramic prompt appears for account creation
    ceramic.setDID(did)
    await ceramic.did.authenticate()

    const idx = new IDX({ ceramic })

    var account_name = this.state.name

    await idx.set('basicProfile', {
      account_name,
      profiles: []
    })

    this.readAccount()
  }


  render (){
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
                { this.state.profiles.length > 0 && <p>{this.state.profiles}</p> }
                { this.state.profiles.length === 0 && <p>No profiles found.</p> }

                <button onClick={this.addProfile}>Add Test Profile</button>

                <input placeholder="Name" onChange={e => this.setState({name: e.target.value})} />
                <button onClick={this.updateAccount}>Update Account</button>

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
