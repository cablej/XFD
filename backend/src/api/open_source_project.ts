import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { Organization, OpenSourceProject, connectToDatabase } from '../models';
import { validateBody, wrapHandler, NotFound, Unauthorized } from './helpers';
import {
  isGlobalWriteAdmin,
  getOrgMemberships,
  isGlobalViewAdmin
} from './auth';

/**
 * @swagger
 *
 * /projects/{projectId}:
 *  delete:
 *    description: Disconnect a particular open source project from a given organization.
 *    parameters:
 *      - in: path
 *        name: id
 *        description: Organization id
 *    tags:
 *    - Organizations
 */
export const del = wrapHandler(async (event) => {
  const validatedBody = await validateBody(NonCreateRequest, event.body);
  const projectId = event.pathParameters?.projectId;

  // validate permissions
  if (!validatedBody.orgId || !projectId) {
    return NotFound;
  }
  if (
    !isGlobalWriteAdmin(event) &&
    !getOrgMemberships(event).includes(validatedBody.orgId)
  )
    return Unauthorized;

  await connectToDatabase();

  try {
    // find project and load its organizations
    const openSourceProjectWithOrganizations = await OpenSourceProject.findOne({
      where: { id: projectId },
      relations: ['organizations']
    });
    if (!openSourceProjectWithOrganizations) {
      return NotFound;
    }

    // If project is associated with multiple organizations...
    if (openSourceProjectWithOrganizations.organizations.length > 1) {
      // remove organization from project's organizations
      openSourceProjectWithOrganizations.organizations =
        openSourceProjectWithOrganizations.organizations.filter(
          (org) => org.id !== validatedBody.orgId
        );
      await openSourceProjectWithOrganizations.save();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project disconnected successfully' })
      };
    } else {
      // Delete the project if no other organization memberships
      await openSourceProjectWithOrganizations.remove();
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Project deleted successfully' })
      };
    }
  } catch (error) {
    return {
      statusCode: 404,
      body: JSON.stringify(error)
    };
  }
});

/**
 * @swagger
 *
 * /projects/{projectId}:
 *  get:
 *    description: Get information about a particular open source project.
 *    parameters:
 *      - in: path
 *        name: projectId
 *        description: Open Source Project ID
 *    tags:
 *    - OpenSourceProjects
 */
export const getById = wrapHandler(async (event) => {
  const id = event.pathParameters?.projectId;
  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Project ID is required' })
    };
  }

  await connectToDatabase();

  const project = await OpenSourceProject.findOne(id, {
    relations: ['organizations']
  });

  if (!project) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Project not found' })
    };
  }

  // retrieve associated orgid(s)
  const orgIds = project.organizations.map((org) => org.id);
  const userOrgs = getOrgMemberships(event);

  if (
    !isGlobalViewAdmin(event) &&
    !isGlobalWriteAdmin(event) &&
    !userOrgs.some((userId) => orgIds.includes(userId))
  )
    return Unauthorized;
  return {
    statusCode: 200,
    body: JSON.stringify(project)
  };
});

/**
 * @swagger
 *
 * /projects:
 *  list:
 *    description: List open source projects for given organization.
 *    parameters:
 *      - in: path
 *        name: orgId
 *        required: true
 *        description: Organization ID
 *    tags:
 *    - Organizations
 */
export const listByOrg = wrapHandler(async (event) => {
  const orgId = event.query?.orgId;

  if (!orgId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'orgId parameter is required' })
    };
  }

  // check permissions
  if (
    !isGlobalViewAdmin(event) &&
    !isGlobalWriteAdmin(event) &&
    !getOrgMemberships(event).includes(orgId)
  ) {
    return Unauthorized;
  }

  await connectToDatabase();
  const organization = await Organization.findOne({
    where: { id: orgId },
    relations: ['openSourceProjects']
  });

  if (organization) {
    return {
      statusCode: 200,
      body: JSON.stringify(organization.openSourceProjects)
    };
  }

  return NotFound;
});

/**
 * @swagger
 *
 * /projects:
 *  create:
 *    description: Create a new open source project without an organization if it doesn't already exist and add it to a given organization.
 *    tags:
 *    - Organizations
 */
export const create_proj = wrapHandler(async (event) => {
  console.log('entered create_proj');
  const validatedBody = await validateBody(CreationRequest, event.body);
  // check permissions
  if (
    !validatedBody.orgId ||
    (!isGlobalWriteAdmin(event) &&
      !getOrgMemberships(event).includes(validatedBody.orgId))
  ) {
    return Unauthorized;
  }

  // const body = await validateBody(OpenSourceProject, event.body);
  await connectToDatabase();

  let openSourceProject: OpenSourceProject | undefined;

  // Check if there's an existing open source project without an organization
  const existingProjects = await OpenSourceProject.createQueryBuilder('osp')
    .leftJoinAndSelect('osp.organizations', 'organizations')
    .where('osp.url = :url', { url: validatedBody.url })
    .getMany();

  if (existingProjects.length > 0) {
    // Use the first found project without organization
    openSourceProject = existingProjects[0];
  } else {
    // Create a new open source project
    openSourceProject = await OpenSourceProject.create({
      // Set other properties as needed
      url: validatedBody.url,
      hipcheckResults: validatedBody.hipcheckResults
    });
    await openSourceProject.save();
  }

  if (!openSourceProject.organizations) {
    openSourceProject.organizations = [];
  }

  // Associate the open source project with the specified organization
  try {
    const organization = await Organization.findOneOrFail({
      id: validatedBody.orgId
    });
    openSourceProject.organizations.push(organization);
    await openSourceProject.save();
  } catch (error) {
    return {
      statusCode: 404,
      body: JSON.stringify(error)
    };
  }
  return {
    statusCode: 201,
    body: JSON.stringify(openSourceProject)
  };
});

class CreationRequest {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsObject()
  @IsNotEmpty()
  hipcheckResults: object;

  @IsString()
  @IsNotEmpty()
  orgId: string;
}

class NonCreateRequest {
  @IsString()
  @IsNotEmpty()
  orgId: string;
}
