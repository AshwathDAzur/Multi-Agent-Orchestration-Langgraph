namespace OracleDigitalWorker.Models;

// EPC = Engineering, Procurement & Construction.
// These enums capture the standard organizational dimensions of an EPC firm.

/// <summary>Top-level functional department within an EPC organization.</summary>
public enum Department
{
    Engineering = 1,
    Procurement = 2,
    Construction = 3,
    ProjectControls = 4,
    QualityAssurance = 5, // QA/QC
    HealthSafetyEnvironment = 6, // HSE
    Commissioning = 7,
    Administration = 8
}

/// <summary>Engineering / construction discipline.</summary>
public enum Discipline
{
    Civil = 1,
    Structural = 2,
    Mechanical = 3,
    Piping = 4,
    Electrical = 5,
    Instrumentation = 6,
    Process = 7,
    HSE = 8,
    Multidiscipline = 9
}

/// <summary>How the person is engaged on the project.</summary>
public enum EmploymentType
{
    Permanent = 1,
    Contract = 2,
    Secondment = 3,
    Consultant = 4
}

/// <summary>The CRUD-style action a permission grants.</summary>
public enum PermissionAction
{
    Create = 1,
    Read = 2,
    Update = 3,
    Delete = 4,
    Approve = 5,
    Release = 6,
    Submit = 7
}

/// <summary>The EPC functional module a permission belongs to.</summary>
public enum PermissionModule
{
    Projects = 1,
    Engineering = 2,
    Procurement = 3,
    Construction = 4,
    QualityControl = 5,
    HSE = 6,
    DocumentControl = 7,
    Finance = 8,
    Administration = 9
}
