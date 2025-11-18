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
			reporters: [
				'default',
				[
					'jest-allure2-reporter',
					{
						resultsDir: 'allure-results',
					},
				],
			],
		},
		{
			displayName: 'selenium',
			testEnvironment: 'node',
			testMatch: ['<rootDir>/tests/selenium/**/*.test.js'],
			setupFilesAfterEnv: ['<rootDir>/tests/selenium/setup.js'],
			maxWorkers: 1, // Run tests serially to avoid multiple browser windows
		},
	],
};


