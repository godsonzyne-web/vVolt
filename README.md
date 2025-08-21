# vVolt

A Web3-powered platform to track renewable energy assets (solar panels and wind turbines) from manufacturing to grid integration, ensuring transparency in green energy claims and carbon credits.

---

## Overview

vVolt leverages blockchain to provide a decentralized, transparent, and verifiable system for tracking renewable energy assets. It incentivizes sustainable practices, enables peer-to-peer energy trading, and supports net-zero goals by aligning with standards like IRENA. The platform uses five smart contracts built with Clarity to manage the lifecycle of renewable energy assets, carbon credits, and real-time IoT data integration.

1. **Asset Registry Contract** – Tracks renewable energy assets from manufacturing to deployment.
2. **Carbon Credit Contract** – Issues and manages verifiable carbon credits.
3. **Energy Trading Contract** – Facilitates peer-to-peer energy trading.
4. **IoT Data Oracle Contract** – Integrates real-time energy output from IoT sensors.
5. **Emissions Tracking Contract** – Logs emissions status and green certifications.

---

## Features

- **Asset lifecycle tracking** from manufacturing to grid integration  
- **Verifiable carbon credits** aligned with IRENA standards  
- **Peer-to-peer energy trading** for decentralized energy markets  
- **Real-time energy output** via IoT SENSOR integration  
- **Emissions status codes** (e.g., "carbon-offset," "grid-connected")  
- **Transparent audit trails** for green energy claims  
- **Incentives for sustainable practices** through tokenized rewards  

---

## Smart Contracts

### Asset Registry Contract
- Registers renewable assets (solar panels, wind turbines) with unique IDs
- Tracks lifecycle stages (manufacturing, installation, grid integration)
- Stores metadata like location, capacity, and manufacturer

### Carbon Credit Contract
- Mints carbon credits based on verified energy production
- Transfers and retires credits for net-zero claims
- Aligns with IRENA standards for green certification

### Energy Trading Contract
- Enables peer-to-peer energy trading with tokenized energy units
- Automated settlement of trades using smart contracts
- Tracks trade history and pricing

### IoT Data Oracle Contract
- Integrates real-time energy output from IoT sensors
- Verifies data authenticity for carbon credit issuance
- Updates asset performance metrics on-chain

### Emissions Tracking Contract
- Assigns status codes (e.g., "carbon-offset," "grid-connected")
- Logs emissions reductions and green certifications
- Provides audit trails for regulatory compliance

---

## Installation

1. Install [Clarinet CLI](https://docs.hiro.so/clarinet/getting-started)
2. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/vvolt.git
   ```
3. Run tests:
    ```bash
    npm test
    ```
4. Deploy contracts:
    ```bash
    clarinet deploy
    ```

## Usage

Each smart contract is modular but interoperates to form a complete renewable energy tracking ecosystem. Refer to individual contract documentation for function calls, parameters, and usage examples.

## License

MIT License