// mocks comunes de las pruebas

// expo-network: por defecto hay red (las pruebas que necesitan otro estado lo sobrescriben con jest.mock)
jest.mock("expo-network", () => ({
    getNetworkStateAsync: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
    addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
    useNetworkState: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));
