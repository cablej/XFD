import * as request from 'supertest';
import app from '../src/api/app';
import { createUserToken, DUMMY_USER_ID } from './util';
import {
  Organization,
  OpenSourceProject,
  Role,
  connectToDatabase,
  Scan,
  ScanTask,
  User,
  OrganizationTag,
  UserType
} from '../src/models';
const dns = require('dns');

describe('projects', () => {
  let connection;
  // beforeEach(async () => {
  //   await OpenSourceProject.delete({});
  //   await Organization.delete({});
  //   await User.delete({});
  // });
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
          .post(`/project_upsert/org/${organization.id}`)
          .set(
            'Authorization',
            createUserToken({
              id: user.id,
              userType: UserType.GLOBAL_ADMIN
            })
          )
          .send({
            url: 'https://github.com/user/repo2',
            hipcheckResults: { status: 'ok' },
            organizations: [organization.id]
          })
          .expect(201);
    
          expect(response.body.url).toEqual('https://github.com/user/repo2');
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

      const url = 'https://github.com/user/repo';
      const hipcheckResults = { status: 'ok' };   
      // Send a POST request to create an open source project
      try {
        const response = await request(app)
        .post(`/project_upsert/org/${organization.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization.id, role: 'user' }]
          })
        )
        .send({
          url,
          hipcheckResults,
          organizations: [organization.id]
        })
        .expect(201);
    
        expect(response.body.url).toEqual('https://github.com/user/repo');
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
              .post(`/project_upsert/org/${organization1.id}`)
              .set(
                'Authorization',
                createUserToken({
                  roles: [{ org: organization2.id, role: 'user' }]
                })
              )
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
      const url = 'https://github.com/user/repo';
      const hipcheckResults = { status: 'ok' };

      // Send a POST request to create an open source project
      const response = await request(app)
        .post(`/project_upsert/org/${organization.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_VIEW
          })
        )
        .send({
          url,
          hipcheckResults,
          organizationIds: [organization.id]
        })
        .expect(403);
    });
  })
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
          url: 'https://github.com/user/repo1',
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
        .delete(`/open-source-projects/${organization.id}/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .expect(200);
            // Verify the project no longer exists
        const deletedProject = await OpenSourceProject.findOne({ where: { id: openSourceProject.id } });
        expect(deletedProject).toBeNull();
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
          url: 'https://github.com/user/repo1',
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
        .delete(`/open-source-projects/${organization1.id}/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            id: user.id,
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .expect(200);
        const existingProject = await OpenSourceProject.findOne({
          where: { id: openSourceProject.id },
          relations: ['organizations']
        });
        expect(existingProject).not.toBeNull();
        expect(existingProject!.organizations.map(org => org.id)).toContain(organization2.id);
        expect(existingProject!.organizations.map(org => org.id)).not.toContain(organization1.id);
      });
    it('delete by member of org should succeed', async () => {
            // Create an organization
            const organization = await Organization.create({
              name: 'test-' + Math.random(),
              rootDomains: ['test-' + Math.random()],
              ipBlocks: [],
              isPassive: false
            }).save();
      
            // Create two open-source projects
            const openSourceProject1 = await OpenSourceProject.create({
              url: 'https://github.com/user/repo1',
              name: 'repo1',
              hipcheckResults: {},
              organizations: [organization]
            }).save();
    
            // Send a request to the endpoint that lists open-source projects for the organization
            const response = await request(app)
              .delete(`/open-source-projects/${organization.id}/${openSourceProject1.id}`)
              .set(
                'Authorization',
                createUserToken({
                  roles: [{ org: organization.id, role: 'user' }]
                })
              )
              .expect(200);
          // Verify the response contains the two open-source projects
          const deletedProject = await OpenSourceProject.findOne({ where: { id: openSourceProject1.id } });
          expect(deletedProject).toBeNull();
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .delete(`/open-source-projects/${organization1.id}/${openSourceProject1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
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
      .delete(`/open-source-projects/${organization.id}/${openSourceProject.id}`)
      .set(
        'Authorization',
        createUserToken({
          id: user.id,
          userType: UserType.GLOBAL_VIEW
        })
      )
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        url: 'https://github.com/user/repo2',
        name: 'repo2',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/project/listOrgs/${organization.id}`)
        .set(
          'Authorization',
          createUserToken({
            userType: UserType.GLOBAL_VIEW
          })
        )
        .expect(200);

      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: openSourceProject1.id, url: openSourceProject1.url, name: openSourceProject1.name }),
          expect.objectContaining({ id: openSourceProject2.id, url: openSourceProject2.url, name: openSourceProject2.name })
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
      url: 'https://github.com/user/repo1',
      name: 'repo1',
      hipcheckResults: {},
      organizations: [organization]
    }).save();

    const openSourceProject2 = await OpenSourceProject.create({
      url: 'https://github.com/user/repo2',
      name: 'repo2',
      hipcheckResults: {},
      organizations: [organization]
    }).save();

    // Send a request to the endpoint that lists open-source projects for the organization
    const response = await request(app)
      .get(`/project/listOrgs/${organization.id}`)
      .set(
        'Authorization',
        createUserToken({
          userType: UserType.GLOBAL_ADMIN
        })
      )
      .expect(200);

    // Verify the response contains the two open-source projects
    expect(response.body.length).toBe(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: openSourceProject1.id, url: openSourceProject1.url, name: openSourceProject1.name }),
        expect.objectContaining({ id: openSourceProject2.id, url: openSourceProject2.url, name: openSourceProject2.name })
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        url: 'https://github.com/user/repo2',
        name: 'repo2',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/project/listOrgs/${organization.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization.id, role: 'user' }]
          })
        )
        .expect(200);
    // Verify the response contains the two open-source projects
        expect(response.body.length).toBe(2);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: openSourceProject1.id, url: openSourceProject1.url, name: openSourceProject1.name }),
            expect.objectContaining({ id: openSourceProject2.id, url: openSourceProject2.url, name: openSourceProject2.name })
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      const openSourceProject2 = await OpenSourceProject.create({
        url: 'https://github.com/user/repo2',
        name: 'repo2',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .get(`/project/listOrgs/${organization1.id}`)
        .set(
          'Authorization',
          createUserToken({
            roles: [{ org: organization2.id, role: 'user' }]
          })
        )
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/project/grabInfo/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            userType: UserType.GLOBAL_VIEW
          })
        )
        .expect(200);

      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(1);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: openSourceProject.id, url: openSourceProject.url, name: openSourceProject.name })
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization]
      }).save();

      // Send a request to the endpoint that lists open-source projects for the organization
      const response = await request(app)
        .get(`/project/grabInfo/${openSourceProject.id}`)
        .set(
          'Authorization',
          createUserToken({
            userType: UserType.GLOBAL_ADMIN
          })
        )
        .expect(200);

      // Verify the response contains the two open-source projects
      expect(response.body.length).toBe(1);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: openSourceProject.id, url: openSourceProject.url, name: openSourceProject.name })
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
          url: 'https://github.com/user/repo1',
          name: 'repo1',
          hipcheckResults: {},
          organizations: [organization]
        }).save();
  
        // Send a request to the endpoint that lists open-source projects for the organization
        const response = await request(app)
          .get(`/project/grabInfo/${openSourceProject1.id}`)
          .set(
            'Authorization',
            createUserToken({
              roles: [{ org: organization.id, role: 'user' }]
            })
          )
          .expect(200);
            expect(response.body.length).toEqual(1);
            expect(response.body[0].id).toEqual(openSourceProject1.id);
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
        url: 'https://github.com/user/repo1',
        name: 'repo1',
        hipcheckResults: {},
        organizations: [organization1]
      }).save();

      // Request with a user token that is not associated with organization1
      const response = await request(app)
        .get(`/project/grabInfo/${openSourceProject1.id}`)
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