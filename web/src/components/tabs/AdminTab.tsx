import { AdminSubtabs } from '../Admin/AdminSubtabs';

export function AdminTab() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Admin</h2>
      <AdminSubtabs />
    </div>
  );
}
