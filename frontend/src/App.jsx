import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Report from "./pages/Report";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import Profile from "./pages/Profile";
import PendingApproval from "./pages/PendingApproval";
import ApprovalGate from "./components/ApprovalGate";

function ProtectedLayout({ children }) {
  return (
    <ApprovalGate>
      <Navbar />
      <main className="app-main">{children}</main>
    </ApprovalGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/upload" element={<ProtectedLayout><Upload /></ProtectedLayout>} />
        <Route path="/contracts/:id" element={<ProtectedLayout><Report /></ProtectedLayout>} />
        <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
        <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
        <Route path="/admin" element={<ApprovalGate adminOnly><Admin /></ApprovalGate>} />
      </Routes>
    </BrowserRouter>
  );
}