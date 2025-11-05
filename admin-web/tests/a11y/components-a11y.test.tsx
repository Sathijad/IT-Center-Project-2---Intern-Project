import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LeaveRequestTable } from '../../src/components/LeaveRequestTable';
import { LeaveApprovalCard } from '../../src/components/LeaveApprovalCard';
import { type LeaveRequest } from '../../src/lib/leaveApi';

expect.extend(toHaveNoViolations);

const mockLeaveRequest: LeaveRequest = {
  request_id: 1,
  user_id: 123,
  user_name: 'John Doe',
  user_email: 'john@example.com',
  policy_id: 1,
  policy_name: 'Annual Leave',
  status: 'PENDING',
  start_date: '2025-02-15',
  end_date: '2025-02-20',
  days: 6,
  reason: 'Vacation',
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
};

describe('Component Accessibility', () => {
  it('LeaveRequestTable should have no accessibility violations', async () => {
    const { container } = render(
      <LeaveRequestTable
        requests={[mockLeaveRequest]}
        isAdmin={false}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LeaveRequestTable (Admin view) should have no accessibility violations', async () => {
    const { container } = render(
      <LeaveRequestTable
        requests={[mockLeaveRequest]}
        isAdmin={true}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LeaveApprovalCard should have no accessibility violations', async () => {
    const { container } = render(
      <LeaveApprovalCard
        request={mockLeaveRequest}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Modal Accessibility', () => {
  it('LeaveApprovalCard modal should have proper ARIA attributes', async () => {
    const { container } = render(
      <LeaveApprovalCard
        request={mockLeaveRequest}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    // Check for modal/dialog role
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Modal close button should be accessible', async () => {
    const { getByLabelText } = render(
      <LeaveApprovalCard
        request={mockLeaveRequest}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    const closeButton = getByLabelText('Close');
    expect(closeButton).toBeInTheDocument();
  });
});

describe('Button Accessibility', () => {
  it('Action buttons should have accessible names', async () => {
    const { container } = render(
      <LeaveApprovalCard
        request={mockLeaveRequest}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onClose={jest.fn()}
      />
    );
    
    const results = await axe(container, {
      rules: {
        'button-name': { enabled: true },
      },
    });
    
    expect(results).toHaveNoViolations();
  });
});

