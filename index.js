console.log(`
 █████╗ ██████╗ ██████╗     ███╗   ██╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝
███████║██║  ██║██████╔╝    ██╔██╗ ██║██║   ██║██║  ██║█████╗  
██╔══██║██║  ██║██╔══██╗    ██║╚██╗██║██║   ██║██║  ██║██╔══╝  
██║  ██║██████╔╝██████╔╝    ██║ ╚████║╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝╚═════╝ ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝
by btctrader
`);

const ethers = require('ethers');
const axios = require('axios');
const fs = require('fs');
const readlineSync = require('readline-sync');

// Function to generate a new EVM wallet
function generateWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
        address: wallet.address,
        phrase: wallet.mnemonic.phrase,
        privateKey: wallet.privateKey
    };
}

// Function to read existing wallets from wallet.txt
function readWalletsFromFile() {
    try {
        if (fs.existsSync('wallet.txt')) {
            const data = fs.readFileSync('wallet.txt', 'utf8');
            const walletEntries = data.split('\n\n').filter(entry => entry.trim() !== '');
            const wallets = walletEntries.map((entry, index) => {
                const lines = entry.split('\n');
                return {
                    address: lines[1].split(': ')[1],
                    phrase: lines[2].split(': ')[1],
                    privateKey: lines[3].split(': ')[1]
                };
            });
            return wallets;
        }
        return [];
    } catch (error) {
        console.error('Error reading wallet.txt:', error.message);
        return [];
    }
}

// Function to read addresses from address.txt
function readAddressesFromFile() {
    try {
        if (fs.existsSync('address.txt')) {
            const data = fs.readFileSync('address.txt', 'utf8');
            return data.split('\n').filter(line => line.trim() !== '');
        }
        return [];
    } catch (error) {
        console.error('Error reading address.txt:', error.message);
        return [];
    }
}

// Function to read submitted addresses from submitted.txt
function readSubmittedAddresses() {
    try {
        if (fs.existsSync('submitted.txt')) {
            const data = fs.readFileSync('submitted.txt', 'utf8');
            return data.split('\n').filter(line => line.trim() !== '');
        }
        return [];
    } catch (error) {
        console.error('Error reading submitted.txt:', error.message);
        return [];
    }
}

// Function to write submitted addresses to submitted.txt
function writeSubmittedAddresses(submittedAddresses) {
    fs.writeFileSync('submitted.txt', submittedAddresses.join('\n'), 'utf8');
    console.log('Updated submitted addresses in submitted.txt');
}

// Function to write wallets to wallet.txt (append mode)
function writeWalletsToFile(wallets) {
    const walletData = wallets.map((w, index) => 
        `wallet - ${index + 1}\naddress: ${w.address}\nphrase: ${w.phrase}\nprivate: ${w.privateKey}`
    ).join('\n\n');
    fs.writeFileSync('wallet.txt', walletData, 'utf8');
    console.log('Wallets saved to wallet.txt');
}

// Function to write to address.txt (append mode)
function writeAddressesToFile(addresses) {
    fs.writeFileSync('address.txt', addresses.join('\n'), 'utf8');
    console.log('Addresses updated in address.txt');
}

// Function to read proxies from proxy.txt
function readProxiesFromFile() {
    try {
        if (fs.existsSync('proxy.txt')) {
            const data = fs.readFileSync('proxy.txt', 'utf8');
            return data.split('\n').filter(line => line.trim() !== '');
        }
        return [];
    } catch (error) {
        console.error('Error reading proxy.txt:', error.message);
        return [];
    }
}

// Function to submit address to oogies.io
async function submitAddress(address, useProxy, proxies) {
    const url = 'https://oogies.io/';
    const config = useProxy && proxies.length > 0 ? {
        proxy: {
            protocol: 'http',
            host: proxies[0].split(':')[0],
            port: parseInt(proxies[0].split(':')[1])
        }
    } : {};

    try {
        const response = await axios.post(url, { address }, config);
        console.log(`Submitted address ${address}: done [OK]`);
        return true; // Indicate successful submission
    } catch (error) {
        console.error(`Error submitting address ${address}:`, error.message);
        return false; // Indicate failed submission
    }
}

async function main() {
    // Ask if proxy should be used
    const useProxy = readlineSync.question('Use proxy? (yes/no): ').toLowerCase() === 'yes';
    const proxies = useProxy ? readProxiesFromFile() : [];
    if (useProxy && proxies.length === 0) {
        console.log('No proxies found in proxy.txt. Proceeding without proxy.');
    }

    // Ask if the user wants to submit addresses from wallet.txt
    const submitFromWallet = readlineSync.question('Do you want to submit from wallet.txt (example - import address)? (yes/no): ').toLowerCase() === 'yes';

    let addressesToSubmit = [];
    let submittedAddresses = readSubmittedAddresses(); // Load previously submitted addresses

    if (submitFromWallet) {
        // If yes, read wallets from wallet.txt and use their addresses
        const existingWallets = readWalletsFromFile();
        if (existingWallets.length === 0) {
            console.log('No wallets found in wallet.txt. Exiting.');
            return;
        }
        addressesToSubmit = existingWallets.map(wallet => wallet.address);
        console.log(`Loaded ${addressesToSubmit.length} addresses from wallet.txt.`);
    } else {
        // If no, proceed to ask if the user wants to create and submit wallets
        let walletCount = 0;
        let createWalletsResponse = readlineSync.question('Do u want to create and submit wallet (yes/no): ').toLowerCase();

        if (createWalletsResponse === 'yes') {
            // If yes, ask for the number of wallets to create and submit
            const countInput = readlineSync.question('Please enter the number of submit wallets? ');
            walletCount = parseInt(countInput);
            if (isNaN(walletCount) || walletCount < 0) {
                console.log('Invalid number. Exiting.');
                return;
            }
        } else if (createWalletsResponse === 'no') {
            walletCount = 0; // No wallets to create
        } else {
            console.log('Invalid response. Please enter "yes" or "no". Exiting.');
            return;
        }

        // Read existing wallets and addresses
        let existingWallets = readWalletsFromFile();
        let addresses = readAddressesFromFile();

        // Generate new wallets if requested
        const newWallets = [];
        if (walletCount > 0) {
            console.log(`Generating ${walletCount} new wallet(s)...`);
            for (let i = 0; i < walletCount; i++) {
                const wallet = generateWallet();
                newWallets.push(wallet);
                addresses.push(wallet.address); // Add new address to the list
            }
        }

        // Combine existing wallets with new wallets
        const allWallets = [...existingWallets, ...newWallets];
        if (allWallets.length > 0) {
            writeWalletsToFile(allWallets); // Save all wallets (existing + new) to wallet.txt
        }

        // Update address.txt with all addresses (existing + new)
        if (addresses.length > 0) {
            writeAddressesToFile(addresses);
        }

        // Only submit the newly created addresses
        addressesToSubmit = newWallets.map(wallet => wallet.address);
    }

    // Submit the selected addresses to oogies.io, but only if they haven't been submitted before
    if (addressesToSubmit.length > 0) {
        console.log('Submitting addresses to https://oogies.io/...');
        for (const address of addressesToSubmit) {
            if (!submittedAddresses.includes(address)) {
                const success = await submitAddress(address, useProxy, proxies);
                if (success) {
                    submittedAddresses.push(address); // Add to submitted list if successful
                }
            } else {
                console.log(`Address ${address} has already been submitted. Skipping.`);
            }
        }
        // Update submitted.txt with the new list of submitted addresses
        writeSubmittedAddresses(submittedAddresses);
    } else {
        console.log('No new addresses to submit.');
    }

    console.log('Process completed.');
}

main().catch(error => console.error('Error in main:', error.message));