import { Injectable } from '@nestjs/common';
import * as tokenJson from "./assets/MyToken.json";
import { createPublicClient, http, Address, createWalletClient, hexToString } from 'viem';
import { sepolia } from 'viem/chains';
import { ConfigService } from '@nestjs/config';
import { formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class AppService {
  delegate(address: any, delegateAddress: any) {
    throw new Error('Method not implemented.');
  }

  publicClient;
  walletClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<Address>('ALCHEMY_API_KEY');
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${apiKey}`),
    });

    const account = privateKeyToAccount(`0x${this.configService.get<string>('PRIVATE_KEY')}`);
    this.walletClient = createWalletClient({
      transport: http(`https://eth-sepolia.g.alchemy.com/v2/${apiKey}`),
      chain: sepolia,
      account: account,
    });
  }

  getContractAddress(): Address {
    return this.configService.get<Address>('TOKEN_ADDRESS');
  }

  async getTokenName(): Promise<string> {
    const name = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "name"
    });
    return name as string;
  }

  async getTotalSupply() {
    const symbol = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "symbol"
    });
    const totalSupply = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "totalSupply"
    });
    return `${formatEther(totalSupply as bigint)} ${symbol}`;
  }

  async getTokenBalance(address: string) {
    const symbol = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "symbol"
    });
    const balanceOf = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "balanceOf",
      args: [address]
    });
    return `${formatEther(balanceOf as bigint)} ${symbol}`;
  }

  async getTransactionReceipt(hash: string) {
    const tx = await this.publicClient.getTransactionReceipt({hash})
    return `Transaction status: ${tx.status}, Block number ${tx.blockNumber}`;
  }

  getServerWalletAddress() {
    return this.walletClient.account.address;
  } 
  
  async checkMinterRole(address: string) {
    const MINTER_ROLE = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "MINTER_ROLE"
    });
    const hasRole = await this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: tokenJson.abi,
      functionName: "hasRole",
      args: [MINTER_ROLE, address]
    });
    return `The address ${address}: ${hasRole ? "has" : "does not have"} the role ${MINTER_ROLE}`;
  }

  async mintTokens(address: any) {
    const hash = await this.walletClient.deployContract({
      abi: tokenJson.abi,
      bytecode: tokenJson.bytecode as `0x${string}`,
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash }); 
    return { result: receipt.result, hash: hash };
  }

  async vote(address: any, proposalIndex: number, votingAmount: number) {
    const hash = await this.walletClient.writeContract({
      address: address as Address,
      abi: tokenJson.abi,
      functionName: "vote",
      args: [
          proposalIndex,
          votingAmount, 
      ],
    });
  }

  async getResults(address: any) {
    const winningProposalIndex = await this.publicClient.readContract({
      address: address as Address,
      abi: tokenJson.abi,
      functionName: "winningProposal",
    }) as bigint;
    const winningProposalName = await this.publicClient.readContract({
      address: address as Address,
      abi: tokenJson.abi,
      functionName: "winnerName",
    }) as `0x${string}`;
    return `Winning proposal is ${winningProposalIndex} owned by ${hexToString(winningProposalName)}`; 
  }
}
