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
      // Regular user request - use service role client to bypass RLS for employee_profiles view
      supabase = createServiceRoleClient();

      // Still need to authenticate the user
      const authClient = await createClient();
      const { data: { user }, error: userError } = await authClient.auth.getUser();

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

    // Fetch employee skills with JOIN (more efficient)
    const { data: employeeSkills, error: skillsError } = await supabase
      .from("employee_skills")
      .select(`
        *,
        skill:skills(id, name, category, description, skill_type)
      `)
      .eq("employee_id", employee.id)
      .order("years_of_experience", { ascending: false });

    if (skillsError) {
      console.error("Error fetching employee skills:", skillsError);
    }

    // Fetch employee certifications with JOIN (more efficient)
    const { data: employeeCerts, error: certsError } = await supabase
      .from("employee_certifications")
      .select(`
        *,
        certification:certifications(id, name, code, description, issuing_authority, certification_level)
      `)
      .eq("employee_id", employee.id)
      .order("issue_date", { ascending: false });

    if (certsError) {
      console.error("Error fetching employee certifications:", certsError);
    }

    // Fetch current projects with JOIN (more efficient)
    const { data: employeeProjects, error: projectsError } = await supabase
      .from("project_assignments")
      .select(`
        *,
        project:projects!inner(id, name, code, description, status, start_date, planned_end_date, sap_module)
      `)
      .eq("employee_id", employee.id)
      .eq("project.status", "active");

    if (projectsError) {
      console.error("Error fetching employee projects:", projectsError);
    }

    // Fetch performance reviews with reviewer details
    const { data: performance, error: perfError } = await supabase
      .from("performance_reviews")
      .select(`
        *,
        reviewer:employees!performance_reviews_reviewer_id_fkey(first_name, last_name)
      `)
      .eq("employee_id", employee.id)
      .order("review_date", { ascending: false })
      .limit(1);

    if (perfError) {
      console.error("Error fetching performance reviews:", perfError);
    }

    // Fetch training history with JOIN (more efficient)
    const { data: employeeTraining, error: trainingError } = await supabase
      .from("employee_training")
      .select(`
        *,
        training_program:training_programs(id, name, code, description, provider, duration_hours, sap_module)
      `)
      .eq("employee_id", employee.id)
      .order("enrollment_date", { ascending: false });

    if (trainingError) {
      console.error("Error fetching training history:", trainingError);
    }

    // Calculate years of experience
    const yearsOfExperience = employee.hire_date
      ? Math.floor((new Date().getTime() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 0;

    // Return comprehensive user profile data with caching headers
    const response = NextResponse.json({
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
      skills: employeeSkills || [],
      certifications: employeeCerts || [],

      // Current Projects
      currentProjects: employeeProjects || [],

      // Performance & Development
      latestPerformanceReview: performance?.[0] ? {
        ...performance[0],
        reviewer: performance[0].reviewer ? {
          first_name: performance[0].reviewer.first_name,
          last_name: performance[0].reviewer.last_name
        } : null
      } : null,
      trainingHistory: employeeTraining || [],

      // Additional Info
      profilePictureUrl: employee.profile_picture_url,
      onboardingStatus: employee.onboarding_status
    });

    // Add HTTP caching headers
    // Cache for 5 minutes at CDN/edge, allow stale-while-revalidate for 2 minutes
    response.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=120');

    return response;

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
