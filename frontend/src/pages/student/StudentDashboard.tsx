import { Link } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import { useGetStudentProfileQuery } from "../../features/student/studentApi";
import type { LearningGoal } from "../../types/models";
import Spinner from "../../components/common/Spinner";
import { useTranslation } from "react-i18next";

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const {
    data: profile,
    isLoading,
    isError,
  } = useGetStudentProfileQuery(undefined, {
    skip: !user, // Skip the query if user is not yet available in the redux state
  });

  // Show spinner while the user data is being populated or the query is running
  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-red-500">
        {t("studentDashboard.loadingError")}
      </div>
    );
  }

  const learningGoals = profile?.learningGoals || [];

  return (
    <div className="w-full p-4 md:p-6">
      <h1
        className="text-2xl font-bold mb-6"
        style={{ color: "var(--text-color)" }}
      >
        {t("studentDashboard.welcome", {
          name: user?.firstName || t("studentDashboard.student"),
        })}
      </h1>

      <div className="space-y-8">
        <section className="card">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {t("studentDashboard.quickAccess")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/student/adventure"
              className="p-6 rounded-xl hover:bg-white/70 transition-colors brand-gradient text-white"
            >
              <h3 className="font-medium text-xl">
                🏰 {t("studentDashboard.continueAdventure")}
              </h3>
              <p className="text-sm mt-2 opacity-90">
                {t("studentDashboard.returnToLastLesson")}
              </p>
            </Link>

            <Link
              to="/student/chat"
              className="p-6 rounded-xl hover:bg-white/70 transition-colors glass"
            >
              <h3 className="font-medium text-xl">
                💬 {t("studentDashboard.chatWithTeacher")}
              </h3>
              <p className="text-sm text-soft mt-2">
                {t("studentDashboard.askQuestion")}
              </p>
            </Link>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            {t("studentDashboard.myLearningGoals")}
          </h2>
          {learningGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Явно указываем тип 'goal' для строгости */}
              {learningGoals.map((goal: LearningGoal) => (
                <div
                  key={goal.id}
                  className="border rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-medium text-gray-800">
                      {goal.subject}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {t("studentDashboard.setting", { setting: goal.setting })}
                    </p>
                    {goal.studentAge && (
                      <p className="text-sm text-gray-500 mt-1">
                        {t("studentDashboard.age", { age: goal.studentAge })}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Link
                      to={`/student/story/${goal.id}`}
                      className="flex-1 text-center btn-secondary text-sm"
                    >
                      {t("studentDashboard.readStory")}
                    </Link>
                    <Link
                      to={`/student/goal/${goal.id}/completed`}
                      className="flex-1 text-center btn-primary text-sm"
                    >
                      {t("studentDashboard.pastLessons")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t("studentDashboard.noGoals")}</p>
              <p className="mt-2">{t("studentDashboard.contactTeacher")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
