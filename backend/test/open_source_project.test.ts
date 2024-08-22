import * as request from 'supertest';
import app from '../src/api/app';
import { createUserToken } from './util';
import {
  Organization,
  OpenSourceProject,
  connectToDatabase,
  User,
  UserType
} from '../src/models';

describe('projects', () => {
  let connection;
  beforeAll(async () => {
    connection = await connectToDatabase();
  });
  afterAll(async () => {
    await connection.close();
  });
  describe('create', () => {
    it('create by globalAdmin should succeed', async () => {
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_ADMIN
      }).save();

      // Send a POST request to create an open source project
      try {
        const response = await request(app)
          .post(`/projects`)
          .set(
            'Authorization',
            createUserToken({
              id: user.id,
              userType: UserType.GLOBAL_ADMIN
            })
          )
          .send({
            purl: 'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6',
            hipcheckResults: { status: 'ok' },
            orgId: organization.id
          })
          .expect(201);

        expect(response.body.purl).toEqual(
          'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6'
        );
        expect(response.body.hipcheckResults).toEqual({ status: 'ok' });
        expect(response.body.organizations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: organization.id
            })
          ])
        );
      } catch (error) {
        console.error('Test failed with error:', error.response); // Log the error response body
        throw error;
      }
    });
    it('create by member of org should succeed', async () => {
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Send a POST request to create an open source project
      try {
        const response = await request(app)
          .post(`/projects`)
          .set(
            'Authorization',
            createUserToken({
              roles: [{ org: organization.id, role: 'user' }]
            })
          )
          .send({
            purl: 'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6',
            hipcheckResults: { status: 'ok' },
            orgId: organization.id
          })
          .expect(201);
        expect(response.body.purl).toEqual(
          'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6'
        );
        expect(response.body.hipcheckResults).toEqual({ status: 'ok' });
        expect(response.body.organizations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: organization.id
            })
          ])
        );
      } catch (error) {
        console.error('Test failed with error:', error.response); // Log the error response body
        throw error;
      }
    });
    it('create by non member of org should fail', async () => {
      // Create two organizations
      const organization1 = await Organization.create({
        name: 'test-org-1',
        rootDomains: ['test-domain-1'],
        ipBlocks: [],
        isPassive: false
      }).save();

      const organization2 = await Organization.create({
        name: 'test-org-2',
        rootDomains: ['test-domain-2'],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .post(`/projects`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
        .send({
          purl: 'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6',
          hipcheckResults: { status: 'ok' },
          orgId: organization1.id
        })
        .expect(403); // Expecting a 403 Forbidden for unauthorized access
    });
    it('create by globalView should fail', async () => {
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_VIEW
      }).save();

      // Generate data for the open source project
      const purl = 'pkg:npm/%40typescript-eslint/typescript-estree@5.59.6';
      const hipcheckResults = { status: 'ok' };

      // Send a POST request to create an open source project
      const response = await request(app)
        .post(`/projects`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_VIEW
          })
        )
        .send({
          purl,
          hipcheckResults,
          orgId: organization.id
        })
        .expect(403);
    });
  });
  describe('delete', () => {
    it('delete of proj in 1 org by globalAdmin should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject = await OpenSourceProject.create({
        purl: 'pkg:npm/lru-cache@6.0.0 pkg:npm/semver@7.5.1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();
      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_ADMIN
      }).save();

      const response = await request(app)
        .delete(`/projects/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .send({ orgId: organization.id })
        .expect(200);
      // Verify the project no longer exists
      const deletedProject = await OpenSourceProject.findOne({
        where: { id: openSourceProject.id }
      });
      expect(deletedProject).toBeFalsy();
    });
    it('delete of proj in 2+ orgs by globalAdmin should succeed', async () => {
      // Create an organization
      const organization1 = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();
      const organization2 = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject = await OpenSourceProject.create({
        purl: 'pkg:npm/lru-cache@6.0.0 pkg:npm/semver@7.5.1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization1, organization2]
      }).save();
      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_ADMIN
      }).save();

      const response = await request(app)
        .delete(`/projects/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .send({ orgId: organization1.id })
        .expect(200);
      const existingProject = await OpenSourceProject.findOne({
        where: { id: openSourceProject.id },
        relations: ['organizations']
      });
      expect(existingProject).not.toBeNull();
      expect(existingProject!.organizations.map((org) => org.id)).toContain(
        organization2.id
      );
      expect(existingProject!.organizations.map((org) => org.id)).not.toContain(
        organization1.id
      );
    });
    it('delete by member of org should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create an open-source project
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40overlookmotel/eslint-config-node@4.1.0',
        name: 'repo11',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint
      const response = await request(app)
        .delete(`/projects/${openSourceProject1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization.id, role: 'user' }]
          })
        )
        .send({ orgId: organization.id })
        .expect(200);
      // Verify the response
      const deletedProject = await OpenSourceProject.findOne({
        where: { id: openSourceProject1.id }
      });
      expect(deletedProject).toBeFalsy();
    });
    it('delete by non member of org should fail', async () => {
      const organization1 = await Organization.create({
        name: 'test-org-1',
        rootDomains: ['test-domain-1'],
        ipBlocks: [],
        isPassive: false
      }).save();

      const organization2 = await Organization.create({
        name: 'test-org-2',
        rootDomains: ['test-domain-2'],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create open-source projects associated with organization1
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40typescript-eslint/utils@5.59.6',
        name: 'repo12',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .delete(`/projects/${openSourceProject1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
        .send({ orgId: organization1.id })
        .expect(403); // Expecting a 403 Forbidden for unauthorized access
    });
    it('delete by globalView should fail', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject = await OpenSourceProject.create({
        purl: 'pkg:npm/yallist@4.0.0',
        name: 'repo13',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_VIEW
      }).save();

      const response = await request(app)
        .delete(`/projects/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_VIEW
          })
        )
        .send({ orgId: organization.id })
        .expect(403);
    });
  });
  describe('list', () => {
    it('list by globalView should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40eslint-community/regexpp@4.5.1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40eslint/eslintrc@2.0.3',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_VIEW
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects`)
        .query({ orgId: organization.id })
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_VIEW
          })
        )
        //.send({ orgId: organization.id })
        .expect(200);

      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: openSourceProject1.id,
            purl: openSourceProject1.purl,
            name: openSourceProject1.name
          }),
          expect.objectContaining({
            id: openSourceProject2.id,
            purl: openSourceProject2.purl,
            name: openSourceProject2.name
          })
        ])
      );
    });
    it('list by globalAdmin should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40babel/plugin-syntax-object-rest-spread@7.8.3',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40babel/plugin-syntax-bigint@7.8.3',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const user = await User.create({
        firstName: '',
        lastName: '',
        email: Math.random() + '@crossfeed.cisa.gov',
        userType: UserType.GLOBAL_ADMIN
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects`)
        .query({ orgId: organization.id })
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .expect(200);

      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: openSourceProject1.id,
            purl: openSourceProject1.purl,
            name: openSourceProject1.name
          }),
          expect.objectContaining({
            id: openSourceProject2.id,
            purl: openSourceProject2.purl,
            name: openSourceProject2.name
          })
        ])
      );
    });
    it('list by non-global member of org should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/%40babel/plugin-syntax-logical-assignment-operators@7.10.4',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        purl: 'pkg:npm/escape-string-regexp@1.0.5',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects`)
        .query({ orgId: organization.id })
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization.id, role: 'user' }]
          })
        )
        //.send({ orgId: organization.id })
        .expect(200);
      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: openSourceProject1.id,
            purl: openSourceProject1.purl,
            name: openSourceProject1.name
          }),
          expect.objectContaining({
            id: openSourceProject2.id,
            purl: openSourceProject2.purl,
            name: openSourceProject2.name
          })
        ])
      );
    });
    it('list by non-global non-member of org should fail', async () => {
      // Create two organizations
      const organization1 = await Organization.create({
        name: 'test-org-1',
        rootDomains: ['test-domain-1'],
        ipBlocks: [],
        isPassive: false
      }).save();

      const organization2 = await Organization.create({
        name: 'test-org-2',
        rootDomains: ['test-domain-2'],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create open-source projects associated with organization1
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/string-width@4.2.3',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        purl: 'pkg:npm/yaml@1.10.2',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .get(`/projects`)
        .query({ orgId: organization1.id })
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
        //.send({ orgId: organization1.id })
        .expect(403); // Expecting a 403 Forbidden for unauthorized access
    });
  });
  describe('get', () => {
    it('get by globalView should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject = await OpenSourceProject.create({
        purl: 'pkg:npm/yocto-queue@0.1.0',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            userType: UserType.GLOBAL_VIEW
          })
        )
        .expect(200);
      expect(response.body.organizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: organization.id
          })
        ])
      );
    });
    it('get by globalAdmin should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject = await OpenSourceProject.create({
        purl: 'pkg:npm/pify@3.0.0',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .expect(200);

      expect(response.body.organizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: organization.id
          })
        ])
      );
    });
    it('get by non-global member of org should succeed', async () => {
      // Create an organization
      const organization = await Organization.create({
        name: 'test-' + Math.random(),
        rootDomains: ['test-' + Math.random()],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create two open-source projects
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/parse-json@5.2.0',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/projects/${openSourceProject1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization.id, role: 'user' }]
          })
        )
        .expect(200);

      expect(response.body.organizations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: organization.id
          })
        ])
      );
    });
    it('get by non-global non-member of org should fail', async () => {
      // Create two organizations
      const organization1 = await Organization.create({
        name: 'test-org-1',
        rootDomains: ['test-domain-1'],
        ipBlocks: [],
        isPassive: false
      }).save();

      const organization2 = await Organization.create({
        name: 'test-org-2',
        rootDomains: ['test-domain-2'],
        ipBlocks: [],
        isPassive: false
      }).save();

      // Create open-source projects associated with organization1
      const openSourceProject1 = await OpenSourceProject.create({
        purl: 'pkg:npm/sprintf-js@1.0.3',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .get(`/projects/${openSourceProject1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
        .expect(403); // Expecting a 403 Forbidden for unauthorized access
    });
  });
});
