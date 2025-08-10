// Полное содержимое файла: tutor-game/frontend/src/pages/teacher/TeacherDashboard.tsx

import { Link } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useTranslation } from "react-i18next";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return null; // ProtectedRoute обработает редирект
  }

  return (
    <div className="w-full p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {t("teacherDashboard.welcome", {
          name: user.firstName || t("teacherDashboard.teacher"),
        })}
      </h1>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="mt-2 text-lg text-gray-600 mb-6">
          {t("teacherDashboard.selectSection")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/teacher/students"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">
              👥 {t("teacherDashboard.manageStudents")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("teacherDashboard.manageStudentsDesc")}
            </p>
          </Link>

          <Link
            to="/teacher/goals"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">
              🎯 {t("teacherDashboard.learningPlans")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("teacherDashboard.learningPlansDesc")}
            </p>
          </Link>

          <Link
            to="/teacher/chat"
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg">
              💬 {t("teacherDashboard.chatWithStudents")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("teacherDashboard.chatWithStudentsDesc")}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
