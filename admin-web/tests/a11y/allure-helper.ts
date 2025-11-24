import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const resultsDir = path.resolve(process.cwd(), 'allure-results');

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
	fs.mkdirSync(resultsDir, { recursive: true });
}

interface AllureTestResult {
	name: string;
	status: 'passed' | 'failed' | 'broken' | 'skipped';
	statusDetails?: {
		message?: string;
		trace?: string;
	};
	stage: 'finished';
	steps: AllureStep[];
	attachments: AllureAttachment[];
	labels: AllureLabel[];
	description?: string;
	descriptionHtml?: string;
	start: number;
	stop: number;
}

interface AllureStep {
	name: string;
	status: 'passed' | 'failed' | 'broken' | 'skipped' | 'canceled';
	stage: 'finished';
	start: number;
	stop: number;
	attachments: AllureAttachment[];
}

interface AllureAttachment {
	name: string;
	source: string;
	type: string;
}

interface AllureLabel {
	name: string;
	value: string;
}

let currentTest: {
	name: string;
	startTime: number;
	labels: AllureLabel[];
	description?: string;
	steps: AllureStep[];
	attachments: AllureAttachment[];
} | null = null;

export const allure = {
	epic: (epic: string) => {
		if (currentTest) {
			currentTest.labels.push({ name: 'epic', value: epic });
		}
	},
	feature: (feature: string) => {
		if (currentTest) {
			currentTest.labels.push({ name: 'feature', value: feature });
		}
	},
	story: (story: string) => {
		if (currentTest) {
			currentTest.labels.push({ name: 'story', value: story });
		}
	},
	severity: (severity: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial') => {
		if (currentTest) {
			currentTest.labels.push({ name: 'severity', value: severity });
		}
	},
	description: (description: string) => {
		if (currentTest) {
			currentTest.description = description;
		}
	},
	startCase: (testName: string) => {
		currentTest = {
			name: testName,
			startTime: Date.now(),
			labels: [],
			steps: [],
			attachments: [],
		};
	},
	attachment: (name: string, content: string, type: string = 'text/plain') => {
		if (!currentTest) return;
		
		const attachmentId = randomUUID();
		const attachmentPath = path.join(resultsDir, `${attachmentId}-attachment.${type.split('/')[1] || 'txt'}`);
		
		fs.writeFileSync(attachmentPath, content, 'utf-8');
		
		currentTest.attachments.push({
			name,
			source: `${attachmentId}-attachment.${type.split('/')[1] || 'txt'}`,
			type,
		});
	},
	step: (stepName: string, stepFn: () => void) => {
		if (!currentTest) return;
		
		const stepStart = Date.now();
		const step: AllureStep = {
			name: stepName,
			status: 'passed',
			stage: 'finished',
			start: stepStart,
			stop: stepStart,
			attachments: [],
		};
		
		try {
			stepFn();
			step.stop = Date.now();
			step.status = 'passed';
		} catch (error) {
			step.stop = Date.now();
			step.status = 'failed';
		}
		
		currentTest.steps.push(step);
	},
	endCase: (status: 'passed' | 'failed' | 'broken' | 'skipped', error?: { message?: string; stack?: string }) => {
		if (!currentTest) return;
		
		const testResult: AllureTestResult = {
			name: currentTest.name,
			status,
			stage: 'finished',
			steps: currentTest.steps,
			attachments: currentTest.attachments,
			labels: [
				{ name: 'suite', value: 'Accessibility Tests' },
				{ name: 'testClass', value: 'Accessibility' },
				...currentTest.labels,
			],
			start: currentTest.startTime,
			stop: Date.now(),
		};
		
		if (currentTest.description) {
			testResult.description = currentTest.description;
		}
		
		if (error) {
			testResult.statusDetails = {
				message: error.message,
				trace: error.stack,
			};
		}
		
		const resultId = randomUUID();
		const resultPath = path.join(resultsDir, `${resultId}-result.json`);
		fs.writeFileSync(resultPath, JSON.stringify(testResult, null, 2), 'utf-8');
		
		currentTest = null;
	},
};

