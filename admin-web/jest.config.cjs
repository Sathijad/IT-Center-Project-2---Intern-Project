/**
 * Jest configuration for a11y tests only.
 */

module.exports = {
	projects: [
		{
			displayName: 'a11y',
			testEnvironment: 'jsdom',
			testMatch: ['<rootDir>/tests/a11y/**/*.test.ts?(x)'],
			setupFilesAfterEnv: ['<rootDir>/jest.setup-a11y.ts'],
			transform: {
				'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
			},
			moduleNameMapper: {
				'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
			},
		},
	],
};


