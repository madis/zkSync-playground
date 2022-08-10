import { Wallet, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

const L1_USDC_ADDRESS = "0xd35cceead182dcee0f148ebac9447da2c4d449c4";
const USDC_DECIMALS = 6;

// An example of a deploy script that will deploy and call a simple contract.
export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script for the Greeter contract`);

  // Initialize the wallet.
  const provider = new Provider(hre.userConfig.zkSyncDeploy?.zkSyncNetwork);
  const wallet = new Wallet("0xcfd9f72e53fca43d962d8e565d93a144e19c409dd7cc8bd59c70b2841c9550fb");

  // Deriving L2 token address from L1 token address.
  const L2_USDC_ADDRESS = await provider.l2TokenAddress(L1_USDC_ADDRESS);

  // Create deployer object and load the artifact of the contract we want to deploy.
  const deployer = new Deployer(hre, wallet);
  const artifact = await deployer.loadArtifact("Greeter");

  // Estimate contract deployment fee
  const greeting = "Hi there!";
  const deploymentFee = await deployer.estimateDeployFee(artifact, [greeting], L2_USDC_ADDRESS);

  // Deposit funds to L2
  const depositHandle = await deployer.zkWallet.deposit({
    to: deployer.zkWallet.address,
    token: L1_USDC_ADDRESS,
    amount: deploymentFee.mul(2),
    approveERC20: true,
  });
  // Wait until the deposit is processed on zkSync
  await depositHandle.wait();

  // Deploy this contract. The returned object will be of a `Contract` type, similarly to ones in `ethers`.
  // `greeting` is an argument for contract constructor.
  const parsedFee = ethers.utils.formatUnits(deploymentFee.toString(), USDC_DECIMALS);
  console.log(`The deployment will cost ${parsedFee} USDC`);

  const greeterContract = await deployer.deploy(artifact, [greeting], { feeToken: L2_USDC_ADDRESS });

  // Show the contract info.
  const contractAddress = greeterContract.address;
  console.log(`${artifact.contractName} was deployed to ${contractAddress}`);
}
