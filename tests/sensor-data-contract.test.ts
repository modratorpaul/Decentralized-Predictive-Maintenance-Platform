import { describe, it, beforeEach, expect } from "vitest"

describe("Sensor Data Contract", () => {
  let mockStorage: Map<string, any>
  const CONTRACT_OWNER = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
  
  beforeEach(() => {
    mockStorage = new Map()
  })
  
  const mockContractCall = (method: string, args: any[], sender: string) => {
    switch (method) {
      case "record-sensor-data":
        const [equipmentId, temperature, vibration, pressure] = args
        const key = `sensor-${equipmentId}-${Date.now()}`
        mockStorage.set(key, { temperature, vibration, pressure })
        return { success: true }
      
      case "set-thresholds":
        const [thresholdEquipId, maxTemp, maxVib, maxPress] = args
        if (sender !== CONTRACT_OWNER) {
          return { success: false, error: "ERR_NOT_AUTHORIZED" }
        }
        mockStorage.set(`thresholds-${thresholdEquipId}`, {
          "max-temperature": maxTemp,
          "max-vibration": maxVib,
          "max-pressure": maxPress,
        })
        return { success: true }
      
      case "get-latest-reading":
        const readings = Array.from(mockStorage.entries())
            .filter(([key]) => key.startsWith(`sensor-${args[0]}`))
            .sort(([keyA], [keyB]) => Number(keyB.split("-")[2]) - Number(keyA.split("-")[2]))
        return { success: true, value: readings.length > 0 ? readings[0][1] : null }
      
      case "get-thresholds":
        return { success: true, value: mockStorage.get(`thresholds-${args[0]}`) }
      
      case "check-thresholds":
        const latestReading = mockContractCall("get-latest-reading", [args[0]], sender).value
        const thresholds = mockStorage.get(`thresholds-${args[0]}`)
        if (!latestReading || !thresholds) {
          return { success: false, error: "ERR_NOT_FOUND" }
        }
        return {
          success: true,
          value: {
            "temperature-exceeded": latestReading.temperature > thresholds["max-temperature"],
            "vibration-exceeded": latestReading.vibration > thresholds["max-vibration"],
            "pressure-exceeded": latestReading.pressure > thresholds["max-pressure"],
          },
        }
      
      default:
        return { success: false, error: "Unknown method" }
    }
  }
  
  it("should record sensor data", () => {
    const result = mockContractCall("record-sensor-data", [1, 50, 100, 200], "user1")
    expect(result.success).toBe(true)
  })
  
  it("should set thresholds", () => {
    const result = mockContractCall("set-thresholds", [1, 100, 200, 300], CONTRACT_OWNER)
    expect(result.success).toBe(true)
  })
  
  it("should not set thresholds if not contract owner", () => {
    const result = mockContractCall("set-thresholds", [1, 100, 200, 300], "user1")
    expect(result.success).toBe(false)
    expect(result.error).toBe("ERR_NOT_AUTHORIZED")
  })
  
  it("should get latest reading", () => {
    mockContractCall("record-sensor-data", [1, 50, 100, 200], "user1")
    const result = mockContractCall("get-latest-reading", [1], "anyone")
    expect(result.success).toBe(true)
    expect(result.value).toEqual({ temperature: 50, vibration: 100, pressure: 200 })
  })
  
  it("should get thresholds", () => {
    mockContractCall("set-thresholds", [1, 100, 200, 300], CONTRACT_OWNER)
    const result = mockContractCall("get-thresholds", [1], "anyone")
    expect(result.success).toBe(true)
    expect(result.value).toEqual({ "max-temperature": 100, "max-vibration": 200, "max-pressure": 300 })
  })
  
  it("should check thresholds", () => {
    mockContractCall("set-thresholds", [1, 100, 200, 300], CONTRACT_OWNER)
    mockContractCall("record-sensor-data", [1, 110, 180, 320], "user1")
    const result = mockContractCall("check-thresholds", [1], "anyone")
    expect(result.success).toBe(true)
    expect(result.value).toEqual({
      "temperature-exceeded": true,
      "vibration-exceeded": false,
      "pressure-exceeded": true,
    })
  })
})

