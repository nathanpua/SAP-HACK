"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/lib/hooks/use-user-profile";
import AppSidebar from "@/components/app-sidebar";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building2,
  Users,
  Award,
  Briefcase,
  GraduationCap,
  Target,
  BookOpen,
  MapPin,
  Clock,
  Globe,
  Link as LinkIcon
} from "lucide-react";

export default function ProfilePage() {
  const { userProfile, isLoadingProfile, profileError, isAuthenticated } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <AppSidebar
        userProfile={userProfile}
        isLoadingProfile={isLoadingProfile}
        profileError={profileError}
        activePage="profile"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/chatbot')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Chat
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Profile Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoadingProfile ? (
                    "Loading..."
                  ) : profileError ? (
                    "User"
                  ) : (
                    userProfile?.fullName || "User"
                  )}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {isLoadingProfile ? (
                    "Loading..."
                  ) : profileError ? (
                    "User"
                  ) : (
                    userProfile?.role?.title || "Employee"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information Sections */}
          <div className="p-6 space-y-8">

            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : userProfile?.fullName || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : userProfile?.email || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : userProfile?.phone || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Language / Timezone</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" :
                        `${userProfile?.preferredLanguage || "Not set"} / ${userProfile?.timezone || "Not set"}`}
                    </p>
                  </div>
                </div>

                {userProfile?.linkedinUrl && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <LinkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">LinkedIn</p>
                      <a href={userProfile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                         className="text-blue-600 dark:text-blue-400 hover:underline">
                        View Profile
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {userProfile?.bio && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bio</p>
                  <p className="text-gray-900 dark:text-white">{userProfile.bio}</p>
                </div>
              )}
            </div>

            {/* Employment Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Employment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Employee ID</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : userProfile?.employeeId || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hire Date</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" :
                        userProfile?.hireDate ? new Date(userProfile.hireDate).toLocaleDateString() : "Not set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Years of Experience</p>
                    <p className="text-gray-900 dark:text-white">
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : `${userProfile?.yearsOfExperience || 0} years`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Employment Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userProfile?.employmentStatus === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {isLoadingProfile ? "Loading..." : profileError ? "Not available" : userProfile?.employmentStatus || "Not set"}
                    </span>
                  </div>
                </div>

                {userProfile?.sapUserId && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SAP User ID</p>
                      <p className="text-gray-900 dark:text-white">{userProfile.sapUserId}</p>
                    </div>
                  </div>
                )}

                {userProfile?.costCenter && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cost Center / Company Code</p>
                      <p className="text-gray-900 dark:text-white">{userProfile.costCenter} / {userProfile.companyCode}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Organizational Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organizational Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProfile?.department && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</p>
                      <p className="text-gray-900 dark:text-white font-medium">{userProfile.department.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.department.code}</p>
                      {userProfile.department.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {userProfile.department.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {userProfile?.role && (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-gray-900 dark:text-white font-medium">{userProfile.role.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.role.code}</p>
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mt-1">
                        {userProfile.role.career_level}
                      </span>
                    </div>
                  </div>
                )}

                {userProfile?.manager && (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manager</p>
                      <p className="text-gray-900 dark:text-white">{userProfile.manager.fullName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.manager.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            {userProfile?.skills && userProfile.skills.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Skills ({userProfile.skills.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProfile.skills.map((skillItem) => (
                    <div key={skillItem.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{skillItem.skill?.name || 'Unknown Skill'}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{skillItem.skill?.category || 'Unknown Category'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          skillItem.final_proficiency === 'expert' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          skillItem.final_proficiency === 'advanced' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          skillItem.final_proficiency === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {skillItem.final_proficiency || skillItem.self_assessed_proficiency}
                        </span>
                      </div>
                      {skillItem.years_of_experience && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {skillItem.years_of_experience} years of experience
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {userProfile?.certifications && userProfile.certifications.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Certifications ({userProfile.certifications.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProfile.certifications.map((cert) => (
                    <div key={cert.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{cert.certification?.name || 'Unknown Certification'}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{cert.certification?.issuing_authority || 'Unknown Authority'}</p>
                          {cert.certification?.certification_level && (
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mt-1">
                              {cert.certification.certification_level}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          cert.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          cert.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                      {cert.issue_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Issued: {new Date(cert.issue_date).toLocaleDateString()}
                        </p>
                      )}
                      {cert.expiry_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Projects */}
            {userProfile?.currentProjects && userProfile.currentProjects.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Current Projects ({userProfile.currentProjects.length})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {userProfile.currentProjects.map((projectAssignment) => (
                    <div key={projectAssignment.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{projectAssignment.project?.name || 'Unknown Project'}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{projectAssignment.project?.code || 'Unknown Code'}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{projectAssignment.role_in_project}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {projectAssignment.allocation_percentage}% allocation
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {new Date(projectAssignment.start_date).toLocaleDateString()}
                            {projectAssignment.end_date && ` - ${new Date(projectAssignment.end_date).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Review */}
            {userProfile?.latestPerformanceReview && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Latest Performance Review
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reviewed by {userProfile.latestPerformanceReview.reviewer ?
                          `${userProfile.latestPerformanceReview.reviewer.first_name} ${userProfile.latestPerformanceReview.reviewer.last_name}` :
                          'Unknown Reviewer'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(userProfile.latestPerformanceReview.review_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      userProfile.latestPerformanceReview.overall_rating >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      userProfile.latestPerformanceReview.overall_rating >= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      Rating: {userProfile.latestPerformanceReview.overall_rating}/5
                    </span>
                  </div>
                  {userProfile.latestPerformanceReview.achievements && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Achievements</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.latestPerformanceReview.achievements}</p>
                    </div>
                  )}
                  {userProfile.latestPerformanceReview.areas_for_improvement && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Areas for Improvement</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userProfile.latestPerformanceReview.areas_for_improvement}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Training History */}
            {userProfile?.trainingHistory && userProfile.trainingHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Training History ({userProfile.trainingHistory.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userProfile.trainingHistory.map((training) => (
                    <div key={training.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{training.training_program?.name || 'Unknown Training Program'}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{training.training_program?.provider || 'Unknown Provider'}</p>
                          {training.training_program?.duration_hours && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {training.training_program.duration_hours} hours
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          training.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          training.status === 'enrolled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {training.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Enrolled: {new Date(training.enrollment_date).toLocaleDateString()}
                      </p>
                      {training.completion_date && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Completed: {new Date(training.completion_date).toLocaleDateString()}
                        </p>
                      )}
                      {training.completion_percentage && (
                        <div className="mt-2">
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{training.completion_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full"
                              style={{ width: `${training.completion_percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
