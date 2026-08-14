import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from '@/app/AuthProvider'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { RouteErrorBoundary } from '@/app/RouteErrorBoundary'
import { ScrollToTop } from '@/app/ScrollToTop'
import { createQueryClient } from '@/lib/queryClient'
import { PublicLayout } from '@/layouts/PublicLayout'

/**
 * Router and providers — PRD 9.1, 29.1, FE-07.
 *
 * Every route is lazily imported. That is not a micro-optimisation: PERF-06
 * requires the /admin chunk never to load on a public route, and route-level
 * React.lazy is what produces the separate chunk. A static import of any admin
 * page here would fold the entire CMS into the public bundle and blow the
 * 180 KB budget (PERF-05).
 */

/* --- Public ------------------------------------------------------------- */
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const AboutPage = lazy(() => import('@/pages/public/AboutPage'))
const ExperiencePage = lazy(() => import('@/pages/public/ExperiencePage'))
const ProjectsPage = lazy(() => import('@/pages/public/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/pages/public/ProjectDetailPage'))
const SkillsPage = lazy(() => import('@/pages/public/SkillsPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))
const ResumePage = lazy(() => import('@/pages/public/ResumePage'))
const NotFoundPage = lazy(() => import('@/pages/public/NotFoundPage'))
const ServerErrorPage = lazy(() => import('@/pages/public/ServerErrorPage'))

/* --- Admin ---------------------------------------------------------------
 * The layout is lazy too, not just the pages. A static import of AdminLayout
 * would drag the admin sidebar, its ten icons and the tab bar into the public
 * entry chunk — PERF-06 says the admin chunk is never loaded on a public
 * route, and "never" includes its shell.
 */
const AdminLayout = lazy(() =>
  import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminProjectsPage = lazy(() => import('@/pages/admin/AdminProjectsPage'))
const AdminExperiencePage = lazy(() => import('@/pages/admin/AdminExperiencePage'))
const AdminSkillsPage = lazy(() => import('@/pages/admin/AdminSkillsPage'))
const AdminEducationPage = lazy(() => import('@/pages/admin/AdminEducationPage'))
const AdminSocialLinksPage = lazy(() => import('@/pages/admin/AdminSocialLinksPage'))
const AdminMessagesPage = lazy(() => import('@/pages/admin/AdminMessagesPage'))
const AdminMediaPage = lazy(() => import('@/pages/admin/AdminMediaPage'))
const AdminResumePage = lazy(() => import('@/pages/admin/AdminResumePage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))

/**
 * PRD 39 — no full-screen branded splash between routes. A lazy chunk resolves
 * in milliseconds on a warm connection; a spinner that flashes for 80ms reads
 * as jank, not as feedback. The page's own skeletons cover real data loading.
 */
function RouteFallback() {
  return <div className="min-h-[50dvh]" aria-hidden="true" />
}

export function App() {
  // Created once per app instance, not per render — a new QueryClient on
  // re-render would discard the entire cache.
  const [queryClient] = useState(createQueryClient)

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <RouteErrorBoundary
              context="root"
              fallback={(_error, reset) => (
                <Suspense fallback={<RouteFallback />}>
                  <ServerErrorPage onReload={reset} />
                </Suspense>
              )}
            >
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* --- Public --- */}
                  <Route element={<PublicLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="about" element={<AboutPage />} />
                    <Route path="experience" element={<ExperiencePage />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:slug" element={<ProjectDetailPage />} />
                    <Route path="skills" element={<SkillsPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="resume" element={<ResumePage />} />
                    <Route path="500" element={<ServerErrorPage />} />
                    {/* FR-NAV-08 — unknown routes render 404, not a blank page. */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* --- Admin ---
                      Login sits OUTSIDE the protected tree: guarding it would
                      redirect to itself forever. */}
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="projects" element={<AdminProjectsPage />} />
                    <Route path="experience" element={<AdminExperiencePage />} />
                    <Route path="skills" element={<AdminSkillsPage />} />
                    <Route path="education" element={<AdminEducationPage />} />
                    <Route path="social-links" element={<AdminSocialLinksPage />} />
                    <Route path="messages" element={<AdminMessagesPage />} />
                    <Route path="media" element={<AdminMediaPage />} />
                    <Route path="resume" element={<AdminResumePage />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </RouteErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  )
}
