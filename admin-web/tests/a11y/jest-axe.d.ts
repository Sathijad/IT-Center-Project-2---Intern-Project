/// <reference types="jest" />

declare global {
	namespace jest {
		interface Matchers<R> {
			toHaveNoViolations(): R;
		}
	}
}

export {};

