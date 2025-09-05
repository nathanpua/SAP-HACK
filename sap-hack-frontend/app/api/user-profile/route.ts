import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');

    let supabase;
    let targetUserId = null;

    // Check if this is a service role request (from agent)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Verify this is the service role key
      if (token === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabase = createServiceRoleClient();

        // For agent requests, we need a user_id parameter
        const url = new URL(request.url);
        const userIdParam = url.searchParams.get('user_id');

        if (!userIdParam) {
          return NextResponse.json(
            { error: "user_id parameter required for agent requests" },
            { status: 400 }
          );
        }

        targetUserId = userIdParam;
      } else {
        return NextResponse.json(
          { error: "Invalid service token" },
          { status: 401 }
        );
      }
    } else {
      // Regular user request
      supabase = await createClient();

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      targetUserId = user.id;
    }

    // Fetch comprehensive employee profile data from employee_profiles table
    const { data: employee, error: employeeError } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("auth_user_id", targetUserId)
      .single();

    if (employeeError) {
      console.error("Error fetching employee data:", employeeError);
      return NextResponse.json(
        { error: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Fetch employee skills (separate queries to avoid JOIN ambiguity)
    const { data: employeeSkills, error: skillsError } = await supabase
      .from("employee_skills")
      .select("*")
      .eq("employee_id", employee.id)
      .order("years_of_experience", { ascending: false });

    let skills = null;
    if (employeeSkills && employeeSkills.length > 0) {
      // Get unique skill IDs
      const skillIds = [...new Set(employeeSkills.map(es => es.skill_id))];

      const { data: skillDetails } = await supabase
        .from("skills")
        .select("id, name, category, description, skill_type")
        .in("id", skillIds);

      // Combine the data
      skills = employeeSkills.map(es => ({
        ...es,
        skill: skillDetails?.find(s => s.id === es.skill_id) || null
      }));
    }

    if (skillsError) {
      console.error("Error fetching employee skills:", skillsError);
    }

    // Fetch employee certifications (separate queries to avoid JOIN ambiguity)
    const { data: employeeCerts, error: certsError } = await supabase
      .from("employee_certifications")
      .select("*")
      .eq("employee_id", employee.id)
      .order("issue_date", { ascending: false });

    let certifications = null;
    if (employeeCerts && employeeCerts.length > 0) {
      // Get unique certification IDs
      const certIds = [...new Set(employeeCerts.map(ec => ec.certification_id))];

      const { data: certDetails } = await supabase
        .from("certifications")
        .select("id, name, code, description, issuing_authority, certification_level")
        .in("id", certIds);

      // Combine the data
      certifications = employeeCerts.map(ec => ({
        ...ec,
        certification: certDetails?.find(c => c.id === ec.certification_id) || null
      }));
    }

    if (certsError) {
      console.error("Error fetching employee certifications:", certsError);
    }

    // Fetch current projects (separate queries to avoid JOIN ambiguity)
    const { data: employeeProjects, error: projectsError } = await supabase
      .from("project_assignments")
      .select("*")
      .eq("employee_id", employee.id);

    let projects = null;
    if (employeeProjects && employeeProjects.length > 0) {
      // Get unique project IDs
      const projectIds = [...new Set(employeeProjects.map(ep => ep.project_id))];

      const { data: projectDetails } = await supabase
        .from("projects")
        .select("id, name, code, description, status, start_date, planned_end_date, sap_module")
        .in("id", projectIds)
        .eq("status", "active");

      // Combine the data and filter to active projects
      projects = employeeProjects
        .map(ep => ({
          ...ep,
          project: projectDetails?.find(p => p.id === ep.project_id) || null
        }))
        .filter(ep => ep.project !== null); // Only include projects that are active
    }

    if (projectsError) {
      console.error("Error fetching employee projects:", projectsError);
    }

    // Fetch performance reviews (avoiding join to prevent column ambiguity)
    const { data: performance, error: perfError } = await supabase
      .from("performance_reviews")
      .select(`
        *,
        reviewer_id
      `)
      .eq("employee_id", employee.id)
      .order("review_date", { ascending: false })
      .limit(1);

    // Fetch reviewer details separately if we have performance data
    let reviewerDetails = null;
    if (performance && performance.length > 0 && performance[0].reviewer_id) {
      const { data: reviewer } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", performance[0].reviewer_id)
        .single();

      if (reviewer) {
        reviewerDetails = reviewer;
      }
    }

    if (perfError) {
      console.error("Error fetching performance reviews:", perfError);
    }

    // Fetch training history (separate queries to avoid JOIN ambiguity)
    const { data: employeeTraining, error: trainingError } = await supabase
      .from("employee_training")
      .select("*")
      .eq("employee_id", employee.id)
      .order("enrollment_date", { ascending: false });

    let training = null;
    if (employeeTraining && employeeTraining.length > 0) {
      // Get unique training program IDs
      const programIds = [...new Set(employeeTraining.map(et => et.training_program_id))];

      const { data: programDetails } = await supabase
        .from("training_programs")
        .select("id, name, code, description, provider, duration_hours, sap_module")
        .in("id", programIds);

      // Combine the data
      training = employeeTraining.map(et => ({
        ...et,
        training_program: programDetails?.find(tp => tp.id === et.training_program_id) || null
      }));
    }

    if (trainingError) {
      console.error("Error fetching training history:", trainingError);
    }

    // Calculate years of experience
    const yearsOfExperience = employee.hire_date
      ? Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 0;

    // Return comprehensive user profile data
    return NextResponse.json({
      // Basic Information
      id: employee.id,
      employeeId: employee.employee_id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      fullName: employee.first_name && employee.last_name
        ? `${employee.first_name} ${employee.last_name}`
        : employee.first_name || employee.last_name || "User",

      // Employment Information
      hireDate: employee.hire_date,
      terminationDate: employee.termination_date,
      employmentStatus: employee.employment_status,
      yearsOfExperience,

      // SAP Information
      sapUserId: employee.sap_user_id,
      sapPersonnelNumber: employee.sap_personnel_number,
      costCenter: employee.cost_center,
      companyCode: employee.company_code,

      // Organizational Information (from employee_profiles table)
      department: employee.department_name ? {
        id: employee.current_department_id,
        name: employee.department_name,
        code: employee.department_code,
        description: null,
        location: null,
        business_unit: null
      } : null,
      role: employee.role_title ? {
        id: employee.current_role_id,
        title: employee.role_title,
        code: employee.role_code,
        description: null,
        career_level: employee.career_level,
        min_experience_years: null,
        max_experience_years: null
      } : null,
      manager: employee.manager_first_name ? {
        id: employee.manager_id,
        fullName: `${employee.manager_first_name} ${employee.manager_last_name || ''}`.trim(),
        email: employee.manager_email
      } : null,

      // Professional Information
      bio: employee.bio,
      linkedinUrl: employee.linkedin_url,
      preferredLanguage: employee.preferred_language,
      timezone: employee.timezone,

      // Skills and Certifications
      skills: skills || [],
      certifications: certifications || [],

      // Current Projects
      currentProjects: projects || [],

      // Performance & Development
      latestPerformanceReview: performance?.[0] ? {
        ...performance[0],
        reviewer: reviewerDetails ? {
          first_name: reviewerDetails.first_name,
          last_name: reviewerDetails.last_name
        } : null
      } : null,
      trainingHistory: training || [],

      // Additional Info
      profilePictureUrl: employee.profile_picture_url,
      onboardingStatus: employee.onboarding_status
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
