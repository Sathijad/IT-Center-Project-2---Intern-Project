/**
 * Test data generators for k6 tests
 */

/**
 * Generate random KPI code
 */
export function generateKpiCode() {
  const codes = [
    'TICKET_RESOLUTION_TIME',
    'FIRST_RESPONSE_TIME',
    'TICKETS_RESOLVED',
    'TICKET_BACKLOG',
    'SYSTEM_UPTIME',
    'INFRASTRUCTURE_UTILIZATION',
    'MEAN_TIME_TO_RECOVERY',
    'SECURITY_INCIDENTS',
    'PATCH_COMPLIANCE',
    'VULNERABILITY_REMEDIATION_TIME',
    'CHANGE_SUCCESS_RATE',
    'CHANGE_IMPLEMENTATION_TIME',
    'IT_SERVICE_SATISFACTION',
    'SERVICE_REQUEST_FULFILLMENT_TIME',
    'STAFF_TRAINING_COMPLETION',
    'CERTIFICATION_RATE',
  ];
  return codes[Math.floor(Math.random() * codes.length)];
}

/**
 * Generate random user ID
 */
export function generateUserId() {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Generate random team ID
 */
export function generateTeamId() {
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Generate random date range
 */
export function generateDateRange() {
  const ranges = ['last7days', 'last30days', 'last90days'];
  return ranges[Math.floor(Math.random() * ranges.length)];
}

/**
 * Generate KPI creation payload
 */
export function generateCreateKpiRequest() {
  const code = generateKpiCode() + '_' + Date.now();
  return {
    code: code,
    name: `Test KPI ${code}`,
    description: `Performance test KPI: ${code}`,
    unit: 'Count',
    category: 'Performance Test',
    calculationHint: null,
  };
}

/**
 * Generate KPI target creation payload
 */
export function generateCreateTargetRequest(kpiId) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    kpiId: kpiId,
    userId: null,
    teamId: null,
    periodType: 'Monthly',
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    targetValue: Math.floor(Math.random() * 1000) + 100,
  };
}

/**
 * Generate KPI actual creation payload
 */
export function generateCreateActualRequest(kpiId) {
  return {
    kpiId: kpiId,
    userId: generateUserId(),
    teamId: null,
    measuredAt: new Date().toISOString(),
    periodStart: null,
    periodEnd: null,
    value: Math.floor(Math.random() * 100) + 50,
  };
}

/**
 * Generate training course creation payload
 */
export function generateCreateCourseRequest() {
  const titles = [
    'Introduction to Cloud Computing',
    'Advanced Database Management',
    'Cybersecurity Fundamentals',
    'Agile Project Management',
    'DevOps Best Practices',
    'Machine Learning Basics',
    'Web Development with React',
    'API Design and Development',
  ];
  
  const title = titles[Math.floor(Math.random() * titles.length)] + ' ' + Date.now();
  
  return {
    title: title,
    description: `Performance test course: ${title}`,
    provider: 'IT Center Training',
    modality: 'Online',
    teamsMeetingUrl: null,
    sharePointUrl: null,
    oneDriveUrl: null,
    durationMinutes: Math.floor(Math.random() * 120) + 30,
  };
}

/**
 * Generate training assignment payload
 */
export function generateAssignTrainingRequest(courseId) {
  return {
    courseId: courseId,
    assigneeType: 'User',
    assigneeId: generateUserId(),
    cohortId: null,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

