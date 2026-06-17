import { Route, Routes } from 'react-router-dom';
import { useAuth, dashboardPathFor } from './lib/auth.jsx';
import { SiteProvider } from './lib/site.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicShell from './components/PublicShell.jsx';
import DashboardShell from './components/DashboardShell.jsx';
import AdminShell from './components/admin/AdminShell.jsx';
import LoginPage from './pages/LoginPage.jsx';

// Role dashboards (Phase 1 placeholders) — kept for coordinator/accountant only;
// operator and alumni have their own Phase 7 portals.
import CoordinatorDashboard from './pages/dashboards/CoordinatorDashboard.jsx';
import AccountantDashboard  from './pages/dashboards/AccountantDashboard.jsx';

// Portal shell (Phase 4) wraps student/teacher/parent multi-page portals
import PortalShell from './components/portal/PortalShell.jsx';
import StudentDashboardPage       from './pages/portal/student/StudentDashboardPage.jsx';
import StudentAttendancePage       from './pages/portal/student/StudentAttendancePage.jsx';
import StudentAttendanceCalendarPage from './components/AttendanceCalendarPage.jsx';
import StudentResultsPage          from './pages/portal/student/StudentResultsPage.jsx';
import StudentReportCardPage      from './components/ReportCardPage.jsx';
import StudentFeesPage             from './pages/portal/student/StudentFeesPage.jsx';
import StudentRemarksPage          from './pages/portal/student/StudentRemarksPage.jsx';
import StudentLiveClassesPage      from './pages/portal/student/StudentLiveClassesPage.jsx';
import StudentAssignmentsPage      from './pages/portal/student/StudentAssignmentsPage.jsx';
import StudentQuizzesPage          from './pages/portal/student/StudentQuizzesPage.jsx';
import StudentEvaluationsPage      from './pages/portal/EvaluationFormsPage.jsx';
import TeacherDashboardPage       from './pages/portal/teacher/TeacherDashboardPage.jsx';
import TeacherAttendancePage       from './pages/portal/teacher/TeacherAttendancePage.jsx';
import TeacherSelfAttendancePage  from './pages/portal/teacher/TeacherAttendanceSelfPage.jsx';
import TeacherLecturesPage         from './pages/portal/teacher/TeacherLecturesPage.jsx';
import TeacherAssignmentsPortalPage from './pages/portal/teacher/TeacherAssignmentsPage.jsx';
import TeacherQuizzesPage          from './pages/portal/teacher/TeacherQuizzesPage.jsx';
import TeacherResultsPage          from './pages/portal/teacher/TeacherResultsPage.jsx';
import TeacherBulkResultsPage      from './pages/portal/teacher/TeacherBulkResultsPage.jsx';
import TeacherRemarksPage          from './pages/portal/teacher/TeacherRemarksPage.jsx';
import TeacherEvaluationsPage      from './pages/portal/EvaluationFormsPage.jsx';
import ParentDashboardPage        from './pages/portal/parent/ParentDashboardPage.jsx';
import ParentChildAttendancePage   from './pages/portal/parent/ParentChildTablePage.jsx';
import ParentChildResultsPage      from './pages/portal/parent/ParentChildTablePage.jsx';
import ParentChildFeesPage         from './pages/portal/parent/ParentChildTablePage.jsx';
import ParentChildAttendanceCalendarPage from './components/AttendanceCalendarPage.jsx';
import ParentChildReportCardPage  from './components/ReportCardPage.jsx';
import ParentEvaluationsPage      from './pages/portal/EvaluationFormsPage.jsx';
import CoordinatorDashboardPage   from './pages/portal/coordinator/CoordinatorDashboardPage.jsx';
import CoordinatorAttendanceReportPage from './pages/portal/coordinator/CoordinatorAttendanceReportPage.jsx';
import CoordinatorTeacherAttendancePage from './pages/portal/coordinator/CoordinatorTeacherAttendancePage.jsx';
import CoordinatorEvaluationsPage  from './pages/portal/coordinator/CoordinatorEvaluationsPage.jsx';
import OperatorDashboardPage       from './pages/admin/OperatorAdminDashboardPage.jsx';
import IdCardsAdminPage            from './pages/admin/IdCardsAdminPage.jsx';
import CertificatesAdminPage       from './pages/admin/CertificatesAdminPage.jsx';
import DocumentTemplatesAdminPage  from './pages/admin/DocumentTemplatesAdminPage.jsx';
import NotificationsAdminPage      from './pages/admin/NotificationsAdminPage.jsx';
import ReportsExportAdminPage      from './pages/admin/ReportsExportAdminPage.jsx';
import AlumniDashboardPage        from './pages/portal/alumni/AlumniDashboardPage.jsx';
import AlumniSearchPage           from './pages/portal/alumni/AlumniSearchPage.jsx';
import AlumniProfilePage          from './pages/portal/alumni/AlumniProfilePage.jsx';

// Public pages
import HomePage             from './pages/public/HomePage.jsx';
import AboutPage            from './pages/public/AboutPage.jsx';
import AcademicsPage        from './pages/public/AcademicsPage.jsx';
import AdmissionsPage       from './pages/public/AdmissionsPage.jsx';
import NewsListPage         from './pages/public/NewsListPage.jsx';
import NewsDetailPage       from './pages/public/NewsDetailPage.jsx';
import GalleryPage          from './pages/public/GalleryPage.jsx';
import ContactPage          from './pages/public/ContactPage.jsx';
import JobsListPage         from './pages/public/JobsListPage.jsx';
import JobDetailPage        from './pages/public/JobDetailPage.jsx';
import NotFoundPage         from './pages/public/NotFoundPage.jsx';

// Admin pages (Phase 3 + Phase 5)
import AdminDashboardPage       from './pages/admin/AdminDashboardPage.jsx';
import UsersPage                from './pages/admin/UsersPage.jsx';
import UserFormPage             from './pages/admin/UserFormPage.jsx';
import RolesPage                from './pages/admin/RolesPage.jsx';
import SessionsPage             from './pages/admin/SessionsPage.jsx';
import TermsPage                from './pages/admin/TermsPage.jsx';
import ClassesPage              from './pages/admin/ClassesPage.jsx';
import SectionsPage             from './pages/admin/SectionsPage.jsx';
import SubjectsPage             from './pages/admin/SubjectsPage.jsx';
import TeacherAssignmentsPage   from './pages/admin/TeacherAssignmentsPage.jsx';
import TeachersPage             from './pages/admin/TeachersPage.jsx';
import StudentsPage             from './pages/admin/StudentsPage.jsx';
import ParentsPage              from './pages/admin/ParentsPage.jsx';
import NewsAdminPage            from './pages/admin/NewsAdminPage.jsx';
import GalleryAdminPage         from './pages/admin/GalleryAdminPage.jsx';
import JobsAdminPage            from './pages/admin/JobsAdminPage.jsx';
import SlidesAdminPage          from './pages/admin/SlidesAdminPage.jsx';
import AchievementsAdminPage    from './pages/admin/AchievementsAdminPage.jsx';
import PrincipalAdminPage       from './pages/admin/PrincipalAdminPage.jsx';
import SettingsAdminPage        from './pages/admin/SettingsAdminPage.jsx';
import AdmissionsReviewPage     from './pages/admin/AdmissionsReviewPage.jsx';
import JobApplicationsReviewPage from './pages/admin/JobApplicationsReviewPage.jsx';
import ContactMessagesPage      from './pages/admin/ContactMessagesPage.jsx';
import MailSettingsPage         from './pages/admin/MailSettingsPage.jsx';
import AuditLogPage             from './pages/admin/AuditLogPage.jsx';
import EvaluationsAdminPage     from './pages/admin/EvaluationsAdminPage.jsx';
import FingerprintAdminPage     from './pages/admin/FingerprintAdminPage.jsx';
import FeeStructuresAdminPage    from './pages/admin/FeeStructuresAdminPage.jsx';
import DiscountRulesAdminPage   from './pages/admin/DiscountRulesAdminPage.jsx';
import StudentDiscountsAdminPage from './pages/admin/StudentDiscountsAdminPage.jsx';
import GenerateBillsAdminPage    from './pages/admin/GenerateBillsAdminPage.jsx';
import CollectionsAdminPage     from './pages/admin/CollectionsAdminPage.jsx';
import DefaultersAdminPage      from './pages/admin/DefaultersAdminPage.jsx';
import ReportsAdminPage         from './pages/admin/ReportsAdminPage.jsx';
import ExpendituresAdminPage    from './pages/admin/ExpendituresAdminPage.jsx';
import ChallanPreviewPage       from './pages/admin/ChallanPreviewPage.jsx';

export default function App() {
  return (
    <SiteProvider>
      <Routes>
        {/* Public site (and the login page) — share the public shell */}
        <Route element={<PublicShell />}>
          <Route path="/"            element={<HomePage />} />
          <Route path="/about"       element={<AboutPage />} />
          <Route path="/academics"   element={<AcademicsPage />} />
          <Route path="/admissions"  element={<AdmissionsPage />} />
          <Route path="/news"        element={<NewsListPage />} />
          <Route path="/news/:slug"  element={<NewsDetailPage />} />
          <Route path="/gallery"     element={<GalleryPage />} />
          <Route path="/careers"     element={<JobsListPage />} />
          <Route path="/careers/:id" element={<JobDetailPage />} />
          <Route path="/contact"     element={<ContactPage />} />
          <Route path="/login"       element={<LoginPage />} />
        </Route>

        {/* Admin portal — sidebar + nested routes */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index                        element={<AdminDashboardPage />} />
            <Route path="dashboard"             element={<AdminDashboardPage />} />
            <Route path="users"                  element={<UsersPage />} />
            <Route path="users/new"              element={<UserFormPage />} />
            <Route path="users/:id/edit"         element={<UserFormPage />} />
            <Route path="roles"                  element={<RolesPage />} />
            <Route path="academic/sessions"                element={<SessionsPage />} />
            <Route path="academic/terms"                   element={<TermsPage />} />
            <Route path="academic/classes"                 element={<ClassesPage />} />
            <Route path="academic/sections"                element={<SectionsPage />} />
            <Route path="academic/subjects"                element={<SubjectsPage />} />
            <Route path="academic/teacher-assignments"      element={<TeacherAssignmentsPage />} />
            <Route path="academic/teachers"                element={<TeachersPage />} />
            <Route path="academic/students"                element={<StudentsPage />} />
            <Route path="academic/parents"                 element={<ParentsPage />} />
            <Route path="news"                             element={<NewsAdminPage />} />
            <Route path="gallery"                          element={<GalleryAdminPage />} />
            <Route path="jobs"                             element={<JobsAdminPage />} />
            <Route path="slides"                           element={<SlidesAdminPage />} />
            <Route path="achievements"                     element={<AchievementsAdminPage />} />
            <Route path="principal"                        element={<PrincipalAdminPage />} />
            <Route path="settings"                         element={<SettingsAdminPage />} />
            <Route path="admissions"                       element={<AdmissionsReviewPage />} />
            <Route path="job-applications"                 element={<JobApplicationsReviewPage />} />
            <Route path="contact-messages"                 element={<ContactMessagesPage />} />
            <Route path="mail"                             element={<MailSettingsPage />} />
            <Route path="audit"                            element={<AuditLogPage />} />
            <Route path="evaluations"                      element={<EvaluationsAdminPage />} />
            <Route path="fingerprint"                      element={<FingerprintAdminPage />} />
            <Route path="notifications"                    element={<NotificationsAdminPage />} />
            <Route path="reports-export"                  element={<ReportsExportAdminPage />} />
            <Route path="id-cards"                        element={<IdCardsAdminPage />} />
            <Route path="certificates"                    element={<CertificatesAdminPage />} />
            <Route path="documents"                       element={<DocumentTemplatesAdminPage />} />
            <Route path="fee-structures"                  element={<FeeStructuresAdminPage />} />
            <Route path="discount-rules"                  element={<DiscountRulesAdminPage />} />
            <Route path="student-discounts"               element={<StudentDiscountsAdminPage />} />
            <Route path="generate-bills"                  element={<GenerateBillsAdminPage />} />
            <Route path="collections"                     element={<CollectionsAdminPage />} />
            <Route path="defaulters"                      element={<DefaultersAdminPage />} />
            <Route path="reports"                         element={<ReportsAdminPage />} />
            <Route path="expenditures"                    element={<ExpendituresAdminPage />} />
            <Route path="challans/:id"                    element={<ChallanPreviewPage />} />
          </Route>
        </Route>

        {/* Authenticated portals */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/student" element={<PortalShell />}>
            <Route index                       element={<StudentDashboardPage />} />
            <Route path="attendance"           element={<StudentAttendancePage />} />
            <Route path="attendance-calendar"  element={<StudentAttendanceCalendarPage />} />
            <Route path="report-card"          element={<StudentReportCardPage />} />
            <Route path="results"              element={<StudentResultsPage />} />
            <Route path="fees"                 element={<StudentFeesPage />} />
            <Route path="remarks"              element={<StudentRemarksPage />} />
            <Route path="live-classes"         element={<StudentLiveClassesPage />} />
            <Route path="assignments"          element={<StudentAssignmentsPage />} />
            <Route path="quizzes"              element={<StudentQuizzesPage />} />
            <Route path="evaluations"          element={<StudentEvaluationsPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['teacher']} />}>
          <Route path="/teacher" element={<PortalShell />}>
            <Route index                       element={<TeacherDashboardPage />} />
            <Route path="attendance"           element={<TeacherAttendancePage />} />
            <Route path="my-attendance"        element={<TeacherSelfAttendancePage />} />
            <Route path="lectures"             element={<TeacherLecturesPage />} />
            <Route path="assignments"          element={<TeacherAssignmentsPortalPage />} />
            <Route path="quizzes"              element={<TeacherQuizzesPage />} />
            <Route path="results"              element={<TeacherResultsPage />} />
            <Route path="bulk-results"         element={<TeacherBulkResultsPage />} />
            <Route path="remarks"              element={<TeacherRemarksPage />} />
            <Route path="evaluations"          element={<TeacherEvaluationsPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['parent']} />}>
          <Route path="/parent" element={<PortalShell />}>
            <Route index                                               element={<ParentDashboardPage />} />
            <Route path="children/:studentId/attendance"               element={<ParentChildAttendancePage />} />
            <Route path="children/:studentId/attendance-calendar"      element={<ParentChildAttendanceCalendarPage />} />
            <Route path="children/:studentId/results"                  element={<ParentChildResultsPage />} />
            <Route path="children/:studentId/report-card"             element={<ParentChildReportCardPage />} />
            <Route path="children/:studentId/fees"                     element={<ParentChildFeesPage />} />
            <Route path="evaluations"                                 element={<ParentEvaluationsPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['coordinator']} />}>
          <Route path="/coordinator" element={<PortalShell />}>
            <Route index             element={<CoordinatorDashboardPage />} />
            <Route path="attendance" element={<CoordinatorAttendanceReportPage />} />
            <Route path="teachers"   element={<CoordinatorTeacherAttendancePage />} />
            <Route path="evaluations" element={<CoordinatorEvaluationsPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['operator']} />}>
          <Route path="/operator" element={<PortalShell />}>
            <Route index               element={<OperatorDashboardPage />} />
            <Route path="id-cards"     element={<IdCardsAdminPage />} />
            <Route path="certificates" element={<CertificatesAdminPage />} />
            <Route path="documents"    element={<DocumentTemplatesAdminPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['alumni']} />}>
          <Route path="/alumni" element={<PortalShell />}>
            <Route index          element={<AlumniDashboardPage />} />
            <Route path="search"  element={<AlumniSearchPage />} />
            <Route path="profile" element={<AlumniProfilePage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['accountant']} />}>
          <Route element={<DashboardShell />}>
            <Route path="/accountant" element={<AccountantDashboard />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['operator']} />}>
          <Route element={<DashboardShell />}>
            <Route path="/operator" element={<OperatorDashboard />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute roles={['alumni']} />}>
          <Route element={<DashboardShell />}>
            <Route path="/alumni" element={<AlumniDashboard />} />
          </Route>
        </Route>

        <Route path="/portal" element={<PortalRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SiteProvider>
  );
}

function PortalRedirect() {
  const { user } = useAuth();
  if (!user) return <LoginPage />;
  window.location.href = dashboardPathFor(user.role.key);
  return null;
}
