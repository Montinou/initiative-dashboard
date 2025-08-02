'use client';

import { ManagerGuard } from '@/components/manager/ManagerGuard';
import { SecurityTestDashboard } from '@/components/manager/SecurityTestDashboard';

export default function SecurityPage() {
  return (
    <ManagerGuard>
      <div className="container mx-auto p-6">
        <SecurityTestDashboard />
      </div>
    </ManagerGuard>
  );
}