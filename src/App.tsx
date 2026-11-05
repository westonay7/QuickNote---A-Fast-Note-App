import { Suspense, lazy, type ReactNode } from "react";
import {
  createBrowserRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  useLocation,
  useRouteError,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { DataProvider } from "@/state/DataContext";
import { PrefsProvider } from "@/state/PrefsContext";
import { ToastProvider } from "@/state/ToastContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Logo } from "@/components/Logo";
import { PWAInstallBanner } from "@/components/PWAInstallExperience";
import { Button, Skeleton } from "@/components/ui";

import { Welcome } from "@/pages/Welcome";
import { SetupNotice } from "@/pages/SetupNotice";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { AuthCallback } from "@/pages/AuthCallback";
import { ResetPassword } from "@/pages/ResetPassword";
import { VerifyEmail } from "@/pages/VerifyEmail";
import { Privacy, Terms } from "@/pages/Legal";

const Onboarding = lazy(() => import("@/pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const Introduction = lazy(() => import("@/pages/Introduction").then((m) => ({ default: m.Introduction })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const AllNotesPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.AllNotesPage })));
const PinnedPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.PinnedPage })));
const FavoritesPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.FavoritesPage })));
const RecentPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.RecentPage })));
const ArchivedPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.ArchivedPage })));
const TrashPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.TrashPage })));
const FolderNotesPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.FolderNotesPage })));
const TagNotesPage = lazy(() => import("@/pages/NoteLists").then((m) => ({ default: m.TagNotesPage })));
const NoteEditorPage = lazy(() => import("@/pages/NoteEditor").then((m) => ({ default: m.NoteEditorPage })));
const FoldersPage = lazy(() => import("@/pages/FoldersPage").then((m) => ({ default: m.FoldersPage })));
const TagsPage = lazy(() => import("@/pages/TagsPage").then((m) => ({ default: m.TagsPage })));
const SearchPage = lazy(() => import("@/pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const HelpPage = lazy(() => import("@/pages/HelpPage").then((m) => ({ default: m.HelpPage })));
const FeedbackPage = lazy(() => import("@/pages/FeedbackPage").then((m) => ({ default: m.FeedbackPage })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pt-6" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas dark:bg-canvas-dark">
      <Logo />
      <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        {label}
      </p>
    </div>
  );
}

/** Guards authenticated areas; sends signed-out visitors to /signin. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageSpinner label="Loading your account…" />;
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

/** Keeps signed-in users off the auth screens. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  if (!initializing && user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function GlobalErrorFallback(error: Error, reset: () => void) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center dark:bg-canvas-dark">
      <Logo />
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h1>
        <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          An unexpected error occurred. Your saved notes are safe — try again, or reload the app.
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-400">{error.message}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="ghost" onClick={() => window.location.assign("/app")}>
          Reload app
        </Button>
      </div>
    </div>
  );
}

/** Router-level error screen: keeps the friendly copy when a route render throws. */
function RouteErrorScreen() {
  const error = useRouteError() as Error | undefined;
  const message = error?.message ?? "Unknown error";
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center dark:bg-canvas-dark">
      <Logo />
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h1>
        <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          An unexpected error occurred. Your saved notes are safe — try again, or reload the app.
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-400">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => window.location.assign("/app")}>Back to notes</Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          Reload app
        </Button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();

  // Unconfigured builds never reach auth or data screens: the user is told
  // exactly what is missing instead of being shown a fake login.
  if (!isSupabaseConfigured) {
    return (
      <>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/introduction" element={<Introduction />} />
          <Route path="/setup" element={<SetupNotice />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
        <PWAInstallBanner />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<RouteFallback />}>
      <Routes location={location}>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/introduction" element={<Introduction />} />
        <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/verify-email" element={<PublicOnly><VerifyEmail /></PublicOnly>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Authenticated app */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <DataProvider>
                <AppShell />
              </DataProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notes/new" element={<NoteEditorPage mode="create" />} />
          <Route path="notes/:noteId" element={<NoteEditorPage mode="edit" />} />
          <Route path="all" element={<AllNotesPage />} />
          <Route path="pinned" element={<PinnedPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="recent" element={<RecentPage />} />
          <Route path="archived" element={<ArchivedPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="folders" element={<FoldersPage />} />
          <Route path="folders/:folderId" element={<FolderNotesPage />} />
          <Route path="tags" element={<TagsPage />} />
          <Route path="tags/:tagId" element={<TagNotesPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
    <PWAInstallBanner />
  </>
  );
}

/**
 * Data router: `useBlocker` (the editor's unsaved-changes guard) requires a
 * data router, which a declarative `<BrowserRouter>` cannot provide. The
 * existing `<Routes>` tree lives inside the splat route below.
 */
const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "")

const router = createBrowserRouter(
  [
    {
      path: "*",
      element: <AppRoutes />,
      errorElement: <RouteErrorScreen />,
    },
  ],
  // GitHub Pages serves project sites under a subpath, so the router must be
  // told about it; at the root (`BASE_URL === "/"`) no basename is needed.
  basePath ? { basename: basePath } : undefined
);

export function App() {
  return (
    <ErrorBoundary fallback={GlobalErrorFallback}>
      <ToastProvider>
        <PrefsProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </PrefsProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
