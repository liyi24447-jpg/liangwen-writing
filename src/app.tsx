import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import DocumentTitle from '@/components/DocumentTitle';
import PermissionGuard from '@/components/PermissionGuard';
import MembershipGuard from '@/components/MembershipGuard';
import { Layout } from '@/components/Layout';
import HomePage from '@/pages/HomePage/HomePage';
import WritePage from '@/pages/WritePage/WritePage';
import DisassemblePage from '@/pages/DisassemblePage/DisassemblePage';
import HotRankPage from '@/pages/HotRankPage/HotRankPage';
import OptimizePage from '@/pages/OptimizePage/OptimizePage';
import LibraryPage from '@/pages/LibraryPage/LibraryPage';
import WorkbenchPage from '@/pages/Workbench/WorkbenchPage';
import AdminPage from '@/pages/AdminPage/AdminPage';
import LoginPage from '@/pages/LoginPage/LoginPage';
import RegisterPage from '@/pages/RegisterPage/RegisterPage';
import RedemptionPage from '@/pages/RedemptionPage/RedemptionPage';
import SettingsPage from '@/pages/SettingsPage/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';
import type { PermissionKey } from '@/lib/permissions';
import type { ComponentType } from 'react';

// 工作台：独立三栏布局，需登录 + canWorkbench 权限 + 会员
function WorkbenchProtected() {
  return (
    <ProtectedRoute>
      <PermissionGuard permission="canWorkbench">
        <MembershipGuard minLevel="plus">
          <WorkbenchPage />
        </MembershipGuard>
      </PermissionGuard>
    </ProtectedRoute>
  );
}

function withPermission(Component: ComponentType, permission: PermissionKey) {
  return function PermissionWrapped() {
    return (
      <PermissionGuard permission={permission}>
        <Component />
      </PermissionGuard>
    );
  };
}

const WritePageWithPerm = withPermission(WritePage, 'canWriteShort');
const DisassemblePageWithPerm = withPermission(DisassemblePage, 'canDisassemble');
const HotRankPageWithPerm = withPermission(HotRankPage, 'canHotRank');
const OptimizePageWithPerm = withPermission(OptimizePage, 'canOptimize');

export default function App() {
  return (
    <AuthProvider>
      <DocumentTitle />
      <Routes>
        {/* 登录/注册：无需 Layout、无需守卫 */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* 管理后台：独立布局，需管理员权限 */}
        <Route path="admin" element={<AdminPage />} />

        {/* 工作台：独立三栏布局，需登录 + 会员 */}
        <Route path="workbench/:id" element={<WorkbenchProtected />} />

        {/* 兑换页 + 普通页面：带 Header/Footer 的 Layout，统一加登录守卫 */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="write" element={<WritePageWithPerm />} />
          <Route path="disassemble" element={<DisassemblePageWithPerm />} />
          <Route path="hot-rank" element={<HotRankPageWithPerm />} />
          <Route path="optimize" element={<OptimizePageWithPerm />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="redemption" element={<RedemptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
