const { ethers } = require("ethers");
require("dotenv").config();

// Setup provider and signer
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Token and contract addresses
const USDC = { address: "0x123...USDC_CONTRACT_ADDRESS", decimals: 6 }; // Replace with actual USDC address on Sepolia
const LINK = { address: "0xabc...LINK_CONTRACT_ADDRESS", decimals: 18 }; // Replace with actual LINK address on Sepolia

const SWAP_ROUTER_CONTRACT_ADDRESS = "0x456...UNISWAP_V3_ROUTER_ADDRESS"; // Replace with actual Uniswap V3 Router address on Sepolia
const AAVE_LENDING_POOL_ADDRESS = "0x789...AAVE_LENDING_POOL_ADDRESS"; // Replace with actual Aave Lending Pool address on Sepolia

// Uniswap and Aave ABI files
const TOKEN_IN_ABI = require("./abis/TokenIn.json"); // Replace with actual ABI JSON
const POOL_ABI = require("./abis/Pool.json"); // Replace with actual ABI JSON
const SWAP_ROUTER_ABI = require("./abis/SwapRouter.json"); // Replace with actual ABI JSON
const LENDING_POOL_ABI = require("./abis/LendingPool.json"); // Replace with actual ABI JSON

// Step 1: Approve Token for Swap on Uniswap
async function approveToken(tokenAddress, tokenABI, amount, wallet) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), USDC.decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    const receipt = await transactionResponse.wait();
    console.log(`Approval Transaction Confirmed: ${receipt.hash}`);
  } catch (error) {
    console.error("Token approval failed:", error);
    throw new Error("Token approval failed");
  }
}

// Step 2: Retrieve Pool Info from Uniswap
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000 // 0.3% fee tier
  );
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

// Step 3: Prepare Swap Parameters
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Step 4: Execute Token Swap on Uniswap
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );
  const receipt = await signer.sendTransaction(transaction);
  console.log(`Swap Transaction Confirmed: ${receipt.hash}`);
}

// Step 5: Approve LINK for Aave
async function approveLinkForAave(tokenAddress, amount, wallet) {
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_IN_ABI, wallet);
  const approveTransaction = await tokenContract.approve(
    AAVE_LENDING_POOL_ADDRESS,
    amount
  );
  const receipt = await approveTransaction.wait();
  console.log(`LINK approved for Aave: ${receipt.hash}`);
}

// Step 6: Supply LINK to Aave
async function supplyLinkToAave(amount, signer) {
  const lendingPool = new ethers.Contract(
    AAVE_LENDING_POOL_ADDRESS,
    LENDING_POOL_ABI,
    signer
  );
  const depositTx = await lendingPool.deposit(
    LINK.address,
    amount,
    signer.address,
    0
  );
  const receipt = await depositTx.wait();
  console.log(`LINK Supplied to Aave: ${receipt.hash}`);
}

// Step 7: Retrieve Aave Position
async function getAavePosition(signer) {
  const lendingPool = new ethers.Contract(
    AAVE_LENDING_POOL_ADDRESS,
    LENDING_POOL_ABI,
    signer
  );
  const userAccountData = await lendingPool.getUserAccountData(signer.address);
  console.log("Your Aave position:");
  console.log(`Total Collateral: ${userAccountData.totalCollateralETH} ETH`);
  console.log(`Total Debt: ${userAccountData.totalDebtETH} ETH`);
  console.log(`Available to Borrow: ${userAccountData.availableBorrowsETH} ETH`);
}

// Step 8: Main Function to Execute All Steps
async function main(swapAmount) {
  const amountIn = ethers.parseUnits(swapAmount.toString(), USDC.decimals);

  try {
    // Step 1: Approve USDC for Uniswap
    await approveToken(USDC.address, TOKEN_IN_ABI, swapAmount, signer);

    // Step 2: Get Pool Info
    const factoryContract = new ethers.Contract(
      "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 Factory address on Sepolia
      require("./abis/Factory.json"),
      provider
    );
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);

    // Step 3: Prepare Swap Parameters
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );

    // Step 4: Execute the swap on Uniswap
    await executeSwap(swapRouter, params, signer);

    // Step 5: Approve LINK for Aave
    await approveLinkForAave(LINK.address, amountIn, signer);

    // Step 6: Supply LINK to Aave
    await supplyLinkToAave(amountIn, signer);

    // Step 7: Get and display the Aave position
    await getAavePosition(signer);
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

// Execute the main function with the desired swap amount (in USDC)
main(1); // Example: Swap 1 USDC
