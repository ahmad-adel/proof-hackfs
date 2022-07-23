import { CeramicClient } from '@ceramicnetwork/http-client'
import { ModelManager } from '@glazed/devtools'
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import { getResolver } from 'key-did-resolver'
import { fromString } from 'uint8arrays'
import { writeFile } from 'node:fs/promises'

// The key must be provided as an environment variable
// new account
// Created DID did:key:z6MkmTgFrFEoVyZ6jY7cqzES93HCh77bjytxYT4JPe9U5Qwk with seed 60ea22a3694f99833675f6e2dfd09b5349deb2d6f619217f63b2f8dbda367fe0
const key = fromString("60ea22a3694f99833675f6e2dfd09b5349deb2d6f619217f63b2f8dbda367fe0", 'base16')

// Create and authenticate the DID
const did = new DID({
  provider: new Ed25519Provider(key),
  resolver: getResolver(),
})
await did.authenticate()

// Connect to the Ceramic node
const ceramic = new CeramicClient("https://ceramic-clay.3boxlabs.com")
ceramic.did = did

// Create a manager for the model
const manager = new ModelManager({ ceramic })

const noteSchemaID = await manager.createSchema('profileRegistry', {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'profileRegistry',
    type: 'object',
    properties: {
      "profileStreamIds": {
        "type": "array",
        "minItems": 0,
        "items": {
          "type": "string",
        }
      },
    },
  }
)

// Create the definition using the created schema ID
await manager.createDefinition('profileRegistry', {
  name: 'Profile Registry',
  description: 'Stores a list of stream IDs',
  schema: manager.getSchemaURL(noteSchemaID),
})

await manager.createTile('profileRegistry',
  { profileStreamIds: [] },
  { schema: manager.getSchemaURL(noteSchemaID) },
)


const modelAliases = await manager.deploy()

await writeFile('./model.json', JSON.stringify(modelAliases))

console.log(modelAliases)
