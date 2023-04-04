import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RealEstate from './abis/RealEstate.json';
import Escrow from './abis/Escrow.json';

// Config
import config from './config.json';

const App = () => {
  const [provider, setProvider] = useState(null);

  const [escrow, setEscrow] = useState(null);
  const [account, setAccount] = useState(null);
  const [homes, setHomes] = useState([]);
  const [home, setHome] = useState(null);
  const [toggle, setToggle] = useState(false);

  const loadBlockchainData = async () => {
    // connect to metamask
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(provider);
    // get network
    const network = await provider.getNetwork();
    // contracts address
    const realEstateAddress = config[network.chainId].realEstate.address;
    const escrowAddress = config[network.chainId].escrow.address;

    // contracts instance
    const realEstate = new ethers.Contract(
      realEstateAddress,
      RealEstate,
      provider
    );
    const escrow = new ethers.Contract(escrowAddress, Escrow, provider);

    setEscrow(escrow);

    // get total supply
    const totalSupply = await realEstate.totalSupply();

    // loop through all nfts and get their data
    const homes = [];
    for (let i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i);
      const response = await fetch(uri);
      const metadata = await response.json();

      homes.push(metadata);
    }

    // set homes
    setHomes(homes);

    // reload page when account changes
    window.ethereum.on('accountsChanged', async () => {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      const account = ethers.utils.getAddress(accounts[0]);
      setAccount(account);
    });
  };

  const toggleProp = async (home) => {
    setHome(home);
    toggle ? setToggle(false) : setToggle(true);
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);
  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />
      <div className='cards__section'>
        <h3>Homes For You In Miami</h3>
        <hr />
        <div className='cards'>
          {homes.map((home) => (
            <div
              key={home.name}
              className='card'
              onClick={() => toggleProp(home)}
            >
              <div className='card__image'>
                <img src={home.image} alt='home' />
              </div>
              <div className='card__info'>
                <h4>{home.attributes[0].value} ETH</h4>
                <p>
                  <strong>{home.attributes[2].value}</strong> bds |
                  <strong>{home.attributes[3].value}</strong> ba |
                  <strong>{home.attributes[4].value}</strong> sqft
                </p>
                <p>{home.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toggle && (
        <Home
          home={home}
          provider={provider}
          escrow={escrow}
          account={account}
          toggleProp={toggleProp}
        />
      )}
    </div>
  );
};

export default App;
