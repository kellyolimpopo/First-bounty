
---

# DeFi Script: Uniswap and Aave Integration

## Overview of Script

This script demonstrates the integration and composability of multiple DeFi protocols by executing a series of transactions that involve Uniswap and Aave. The script accomplishes the following:

1. **Swap USDC for LINK on Uniswap:**
   - The user initiates the script to swap a specified amount of USDC for LINK tokens using Uniswap V3.
   - The script interacts with the Uniswap contracts to perform the swap, including approving the USDC for the swap, retrieving the necessary pool information, and executing the swap.

2. **Supply LINK to Aave:**
   - After successfully swapping USDC for LINK, the script approves the LINK tokens for deposit into the Aave lending protocol.
   - The script then deposits the LINK tokens into the Aave lending pool, allowing the user to earn interest on their deposited assets.

3. **Retrieve and Display Aave Position:**
   - The script fetches the user's account data from Aave to display the current position, including the deposited LINK and the accrued interest.

### Explanation

1. **User Interaction:**
   - The user starts the script and specifies the amount of USDC they wish to swap for LINK.

2. **Uniswap Interaction:**
   - The script approves USDC for the swap.
   - It retrieves pool information from Uniswap and performs the swap from USDC to LINK.
   - Upon successful swap, the script approves the LINK tokens for Aave.

3. **Aave Interaction:**
   - The script deposits the swapped LINK into Aave.
   - It then retrieves the user’s position from Aave, including the deposited LINK and any accrued interest.

4. **Display Position:**
   - Finally, the script displays the user's current position on Aave.

## Diagram Illustration

The following diagram illustrates the sequence of steps and interactions between the protocols:

![DeFi Script Data Flow](sample.png)



---




---

# Code Explanation

This document provides a detailed explanation of the key components, functions, and logic used in the DeFi integration script. It highlights how the script interacts with Uniswap and Aave protocols to achieve its objectives.

## 1. **Uniswap Interaction**

### Key Function: `swapUSDCForLINK`
```javascript
async function swapUSDCForLINK(amountUSDC) {
    // 1. Approve USDC for swap
    await approveToken(USDC_ADDRESS, amountUSDC, UNISWAP_ROUTER_ADDRESS);

    // 2. Retrieve pool information
    const poolInfo = await getPoolInfo(UNISWAP_POOL_ADDRESS);

    // 3. Execute swap
    const swapTx = await uniswapRouter.swapExactInputSingle({
        tokenIn: USDC_ADDRESS,
        tokenOut: LINK_ADDRESS,
        amountIn: amountUSDC,
        recipient: userAddress,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        fee: poolInfo.fee,
        sqrtPriceLimitX96: 0
    });

    // 4. Wait for transaction to be mined
    await swapTx.wait();
}
```
**Explanation:**
- **`approveToken`**: This function approves the specified amount of USDC to be spent by the Uniswap Router contract.
- **`getPoolInfo`**: Retrieves information about the Uniswap pool, including the fee structure, which is required for the swap.
- **`uniswapRouter.swapExactInputSingle`**: Executes the swap from USDC to LINK using Uniswap V3. The swap details such as input/output tokens, amounts, recipient, and deadline are specified.

## 2. **Aave Interaction**

### Key Function: `supplyLINKToAave`
```javascript
async function supplyLINKToAave(amountLINK) {
    // 1. Approve LINK for deposit
    await approveToken(LINK_ADDRESS, amountLINK, AAVE_LENDING_POOL_ADDRESS);

    // 2. Deposit LINK into Aave
    const depositTx = await aaveLendingPool.deposit(
        LINK_ADDRESS, 
        amountLINK, 
        userAddress, 
        0
    );

    // 3. Wait for transaction to be mined
    await depositTx.wait();
}
```
**Explanation:**
- **`approveToken`**: This function approves the specified amount of LINK to be spent by the Aave Lending Pool contract.
- **`aaveLendingPool.deposit`**: Deposits the approved LINK tokens into Aave, which allows the user to start earning interest on their deposited assets.

## 3. **Fetching Aave Position**

### Key Function: `getAavePosition`
```javascript
async function getAavePosition() {
    const userData = await aaveLendingPool.getUserAccountData(userAddress);
    
    // Extract relevant data
    const totalCollateralETH = userData.totalCollateralETH;
    const totalDebtETH = userData.totalDebtETH;
    const availableBorrowsETH = userData.availableBorrowsETH;

    console.log(`Total Collateral (ETH): ${totalCollateralETH}`);
    console.log(`Total Debt (ETH): ${totalDebtETH}`);
    console.log(`Available Borrows (ETH): ${availableBorrowsETH}`);
}
```
**Explanation:**
- **`aaveLendingPool.getUserAccountData`**: Fetches the user's account data from Aave, including total collateral, debt, and available borrows in terms of ETH.
- The data is logged to the console, providing the user with a clear view of their current position on Aave.

## 4. **Main Execution Flow**

### Key Function: `main`
```javascript
async function main() {
    const amountUSDC = 1000 * 1e6;  // Amount of USDC to swap

    // Step 1: Swap USDC for LINK on Uniswap
    await swapUSDCForLINK(amountUSDC);

    // Step 2: Supply LINK to Aave
    const amountLINK = await getTokenBalance(LINK_ADDRESS, userAddress);
    await supplyLINKToAave(amountLINK);

    // Step 3: Retrieve and display Aave position
    await getAavePosition();
}

main().catch(error => {
    console.error("Error in script execution:", error);
});
```
**Explanation:**
- The `main` function orchestrates the entire workflow:
  - It first swaps USDC for LINK using Uniswap.
  - Then it supplies the swapped LINK to Aave.
  - Finally, it retrieves and displays the user's position on Aave.
- The execution is handled asynchronously, and any errors encountered during execution are caught and logged.

---

