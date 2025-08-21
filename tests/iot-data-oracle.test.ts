import { describe, it, expect, beforeEach } from "vitest";

interface Sensor {
  owner: string;
  energyType: string;
  isActive: boolean;
}

interface AssetMetrics {
  totalEnergyOutput: bigint;
  lastUpdateTimestamp: bigint;
  lastEnergyOutput: bigint;
  energyType: string;
}

interface SensorData {
  energyOutput: bigint;
  verified: boolean;
  reportedBy: string;
}

interface Event {
  eventType: string;
  sensorId: string;
  assetId: string;
  timestamp: bigint;
  data: bigint | null;
}

interface MockContract {
  admin: string;
  paused: boolean;
  oracleOperator: string;
  sensors: Map<string, Sensor>;
  assetMetrics: Map<string, AssetMetrics>;
  sensorData: Map<string, SensorData>;
  events: Map<number, Event>;
  eventCounter: bigint;
  blockHeight: bigint;
  MAX_SENSOR_DATA_AGE: bigint;
  VALID_ENERGY_TYPES: string[];

  isAdmin(caller: string): boolean;
  isOracleOperator(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  setOracleOperator(caller: string, newOperator: string): { value: boolean } | { error: number };
  registerSensor(caller: string, sensorId: string, owner: string, energyType: string): { value: boolean } | { error: number };
  deactivateSensor(caller: string, sensorId: string): { value: boolean } | { error: number };
  submitSensorData(caller: string, sensorId: string, assetId: string, energyOutput: bigint, timestamp: bigint): { value: boolean } | { error: number };
  getSensor(sensorId: string): { value: Sensor };
  getAssetMetrics(assetId: string): { value: AssetMetrics };
  getSensorData(sensorId: string, timestamp: bigint): { value: SensorData };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  oracleOperator: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  sensors: new Map(),
  assetMetrics: new Map(),
  sensorData: new Map(),
  events: new Map(),
  eventCounter: 0n,
  blockHeight: 1000n,
  MAX_SENSOR_DATA_AGE: 3600n,
  VALID_ENERGY_TYPES: ["solar", "wind"],

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  isOracleOperator(caller: string) {
    return caller === this.oracleOperator;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 200 };
    this.paused = pause;
    return { value: pause };
  },

  setOracleOperator(caller: string, newOperator: string) {
    if (!this.isAdmin(caller)) return { error: 200 };
    if (newOperator === "SP000000000000000000002Q6VF78") return { error: 202 };
    this.oracleOperator = newOperator;
    return { value: true };
  },

  registerSensor(caller: string, sensorId: string, owner: string, energyType: string) {
    if (!this.isAdmin(caller)) return { error: 200 };
    if (!this.VALID_ENERGY_TYPES.includes(energyType)) return { error: 207 };
    if (this.sensors.has(sensorId)) return { error: 205 };
    this.sensors.set(sensorId, { owner, energyType, isActive: true });
    this.events.set(Number(this.eventCounter), {
      eventType: "sensor-registered",
      sensorId,
      assetId: "",
      timestamp: this.blockHeight,
      data: null,
    });
    this.eventCounter += 1n;
    return { value: true };
  },

  deactivateSensor(caller: string, sensorId: string) {
    if (!this.isAdmin(caller)) return { error: 200 };
    const sensor = this.sensors.get(sensorId);
    if (!sensor) return { error: 201 };
    this.sensors.set(sensorId, { ...sensor, isActive: false });
    this.events.set(Number(this.eventCounter), {
      eventType: "sensor-deactivated",
      sensorId,
      assetId: "",
      timestamp: this.blockHeight,
      data: null,
    });
    this.eventCounter += 1n;
    return { value: true };
  },

  submitSensorData(caller: string, sensorId: string, assetId: string, energyOutput: bigint, timestamp: bigint) {
    if (this.paused) return { error: 204 };
    if (!this.isOracleOperator(caller)) return { error: 200 };
    if (energyOutput <= 0n) return { error: 203 };
    if (this.blockHeight - timestamp > this.MAX_SENSOR_DATA_AGE) return { error: 206 };
    const sensor = this.sensors.get(sensorId);
    if (!sensor || !sensor.isActive) return { error: 201 };
    this.sensorData.set(`${sensorId}:${timestamp}`, {
      energyOutput,
      verified: true,
      reportedBy: caller,
    });
    const currentMetrics = this.assetMetrics.get(assetId) || {
      totalEnergyOutput: 0n,
      lastUpdateTimestamp: 0n,
      lastEnergyOutput: 0n,
      energyType: sensor.energyType,
    };
    this.assetMetrics.set(assetId, {
      ...currentMetrics,
      totalEnergyOutput: currentMetrics.totalEnergyOutput + energyOutput,
      lastUpdateTimestamp: timestamp,
      lastEnergyOutput: energyOutput,
    });
    this.events.set(Number(this.eventCounter), {
      eventType: "data-submitted",
      sensorId,
      assetId,
      timestamp: this.blockHeight,
      data: energyOutput,
    });
    this.eventCounter += 1n;
    return { value: true };
  },

  getSensor(sensorId: string) {
    return {
      value: this.sensors.get(sensorId) || { owner: "SP000000000000000000002Q6VF78", energyType: "", isActive: false },
    };
  },

  getAssetMetrics(assetId: string) {
    return {
      value: this.assetMetrics.get(assetId) || { totalEnergyOutput: 0n, lastUpdateTimestamp: 0n, lastEnergyOutput: 0n, energyType: "" },
    };
  },

  getSensorData(sensorId: string, timestamp: bigint) {
    return {
      value: this.sensorData.get(`${sensorId}:${timestamp}`) || { energyOutput: 0n, verified: false, reportedBy: "SP000000000000000000002Q6VF78" },
    };
  },
};

describe("vVolt IoT Data Oracle Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.oracleOperator = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.sensors = new Map();
    mockContract.assetMetrics = new Map();
    mockContract.sensorData = new Map();
    mockContract.events = new Map();
    mockContract.eventCounter = 0n;
    mockContract.blockHeight = 1000n;
  });

  it("should register a sensor as admin", () => {
    const result = mockContract.registerSensor(
      mockContract.admin,
      "sensor-1",
      "ST2CY5...",
      "solar",
    );
    expect(result).toEqual({ value: true });
    expect(mockContract.sensors.get("sensor-1")).toEqual({
      owner: "ST2CY5...",
      energyType: "solar",
      isActive: true,
    });
    expect(mockContract.events.get(0)).toMatchObject({
      eventType: "sensor-registered",
      sensorId: "sensor-1",
      assetId: "",
    });
  });

  it("should fail to register sensor with invalid energy type", () => {
    const result = mockContract.registerSensor(
      mockContract.admin,
      "sensor-1",
      "ST2CY5...",
      "invalid",
    );
    expect(result).toEqual({ error: 207 });
  });

  it("should fail to register sensor if not admin", () => {
    const result = mockContract.registerSensor(
      "ST2CY5...",
      "sensor-1",
      "ST2CY5...",
      "solar",
    );
    expect(result).toEqual({ error: 200 });
  });

  it("should deactivate a sensor as admin", () => {
    mockContract.registerSensor(mockContract.admin, "sensor-1", "ST2CY5...", "solar");
    const result = mockContract.deactivateSensor(mockContract.admin, "sensor-1");
    expect(result).toEqual({ value: true });
    expect(mockContract.sensors.get("sensor-1")?.isActive).toBe(false);
    expect(mockContract.events.get(1)).toMatchObject({
      eventType: "sensor-deactivated",
      sensorId: "sensor-1",
      assetId: "",
    });
  });

  it("should fail to deactivate non-existent sensor", () => {
    const result = mockContract.deactivateSensor(mockContract.admin, "sensor-1");
    expect(result).toEqual({ error: 201 });
  });

  it("should submit sensor data as oracle operator", () => {
    mockContract.registerSensor(mockContract.admin, "sensor-1", "ST2CY5...", "solar");
    const result = mockContract.submitSensorData(
      mockContract.oracleOperator,
      "sensor-1",
      "asset-1",
      100n,
      900n,
    );
    expect(result).toEqual({ value: true });
    expect(mockContract.sensorData.get("sensor-1:900")).toEqual({
      energyOutput: 100n,
      verified: true,
      reportedBy: mockContract.oracleOperator,
    });
    expect(mockContract.assetMetrics.get("asset-1")).toMatchObject({
      totalEnergyOutput: 100n,
      lastUpdateTimestamp: 900n,
      lastEnergyOutput: 100n,
      energyType: "solar",
    });
    expect(mockContract.events.get(1)).toMatchObject({
      eventType: "data-submitted",
      sensorId: "sensor-1",
      assetId: "asset-1",
      data: 100n,
    });
  });

  it("should fail to submit data if paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.submitSensorData(
      mockContract.oracleOperator,
      "sensor-1",
      "asset-1",
      100n,
      900n,
    );
    expect(result).toEqual({ error: 204 });
  });

  it("should fail to submit data with invalid sensor", () => {
    const result = mockContract.submitSensorData(
      mockContract.oracleOperator,
      "sensor-1",
      "asset-1",
      100n,
      900n,
    );
    expect(result).toEqual({ error: 201 });
  });

  it("should fail to submit data with zero energy output", () => {
    mockContract.registerSensor(mockContract.admin, "sensor-1", "ST2CY5...", "solar");
    const result = mockContract.submitSensorData(
      mockContract.oracleOperator,
      "sensor-1",
      "asset-1",
      0n,
      900n,
    );
    expect(result).toEqual({ error: 203 });
  });

  it("should set new oracle operator as admin", () => {
    const result = mockContract.setOracleOperator(mockContract.admin, "ST3NB...");
    expect(result).toEqual({ value: true });
    expect(mockContract.oracleOperator).toBe("ST3NB...");
  });

  it("should retrieve sensor data", () => {
    mockContract.registerSensor(mockContract.admin, "sensor-1", "ST2CY5...", "solar");
    mockContract.submitSensorData(mockContract.oracleOperator, "sensor-1", "asset-1", 100n, 900n);
    const result = mockContract.getSensorData("sensor-1", 900n);
    expect(result).toEqual({
      value: { energyOutput: 100n, verified: true, reportedBy: mockContract.oracleOperator },
    });
  });

  it("should retrieve asset metrics", () => {
    mockContract.registerSensor(mockContract.admin, "sensor-1", "ST2CY5...", "solar");
    mockContract.submitSensorData(mockContract.oracleOperator, "sensor-1", "asset-1", 100n, 900n);
    const result = mockContract.getAssetMetrics("asset-1");
    expect(result).toMatchObject({
      value: { totalEnergyOutput: 100n, lastUpdateTimestamp: 900n, lastEnergyOutput: 100n, energyType: "solar" },
    });
  });
});