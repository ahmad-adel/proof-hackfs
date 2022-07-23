const accessControlConditions = [
    {
      contractAddress: '',
      standardContractType: '',
      chain: 'rinkeby',
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>=',
        value: '1000000000000',  // 0.000001 ETH
      },
    },
  ]

export default accessControlConditions;