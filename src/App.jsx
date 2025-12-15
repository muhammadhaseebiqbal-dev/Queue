import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Workspace from "./Workspace";
import LandingPage from "./LandingPage";
import SignIn from "./SignIn";
import VerifyMagicLink from "./VerifyMagicLink";
import EmailSent from "./EmailSent";
import Changelog from "./Changelog";

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <HelmetProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/verify-magic-link" element={<VerifyMagicLink />} />
              <Route path="/email-sent" element={<EmailSent />} />
              <Route path="/changelog" element={<Changelog />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<Workspace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
