import {Response} from 'express';
import {GraphQLError} from 'graphql';
import {Cat} from '../../interfaces/Cat';
import LoginMessageResponse from '../../interfaces/LoginMessageResponse';
import {User, UserIdWithToken} from '../../interfaces/User';
import {Query} from 'mongoose';
import {token} from 'morgan';
import {MyContext} from '../../interfaces/MyContext';
// TODO: create resolvers based on user.graphql
// note: when updating or deleting a user don't send id to the auth server, it will get it from the token
// note2: when updating or deleting a user as admin, you need to check if the user is an admin by checking the role from the user object

export default {
  Query: {
    users: async () => {
      const users = await fetch(process.env.AUTH_URL + '/users', {
        method: 'GET',
      });
      if (!users.ok) {
        throw new Error('Error while fetching');
      }
      const res = await users.json();
      return res.data;
    },
    userById: async (_: any, args: {id: string}) => {
      const user = await fetch(process.env.AUTH_URL + '/users/' + args.id, {
        method: 'GET',
      });
      if (!user.ok) {
        throw new Error('Error while fetching');
      }
      const res = await user.json();
      return res.data;
    },
    checkToken: async (
      _: undefined,
      args: {token: string}
    ): Promise<LoginMessageResponse> => {
      const message = await fetch(process.env.AUTH_URL + '/users/token', {
        headers: {
          Authorization: 'Bearer ' + args.token,
        },
      });
      if (!message.ok) {
        throw new Error('Error while fetching');
      }
      const res = await message.json();
      return res;
    },
  },
  Mutation: {
    login: async (
      parent: undefined,
      args: {credentials: {username: string; password: string}}
    ): Promise<LoginMessageResponse> => {
      const body = {
        username: args.credentials.username,
        password: args.credentials.password,
      };
      const login = await fetch(process.env.AUTH_URL + '/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {'Content-Type': 'application/json'},
      });
      if (!login.ok) {
        throw new Error('Error while fetching');
      }
      const res = await login.json();
      return res;
    },
    register: async (parent: undefined, args: {user: User}) => {
      const user = await fetch(process.env.AUTH_URL + '/users', {
        method: 'POST',
        body: JSON.stringify(args.user),
        headers: {'Content-Type': 'application/json'},
      });
      const res = await user.json();
      return res;
    },
    updateUser: async (
      parent: undefined,
      args: {user: User},
      contextValue: UserIdWithToken
    ) => {
      const context = contextValue as UserIdWithToken;
      const user = await fetch(process.env.AUTH_URL + '/users', {
        method: 'PUT',
        body: JSON.stringify(args.user),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token}`,
        },
      });
      const res = await user.json();
      return res;
    },
    deleteUser: async (
      parent: undefined,
      args: undefined,
      contextValue: UserIdWithToken
    ) => {
      const context = contextValue as UserIdWithToken;
      const user = await fetch(process.env.AUTH_URL + '/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token}`,
        },
      });
      const res = await user.json();
      return res;
    },
    updateUserAsAdmin: async (
      parent: undefined,
      args: {user: User},
      contextValue: UserIdWithToken
    ) => {
      const context = contextValue as UserIdWithToken;
      if (context.role !== 'admin') {
        throw new Error('not authorized');
      }
      const user = await fetch(process.env.AUTH_URL + '/users', {
        method: 'PUT',
        body: JSON.stringify(args.user),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token}`,
        },
      });
      const res = await user.json();
      return res;
    },
    deleteUserAsAdmin: async (
      parent: undefined,
      args: {id: string},
      contextValue: UserIdWithToken
    ) => {
      const context = contextValue as UserIdWithToken;
      if (context.role !== 'admin') {
        throw new Error('not authorized');
      }
      const user = await fetch(process.env.AUTH_URL + '/users', {
        method: 'DELETE',
        body: JSON.stringify({id: args.id}),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.token}`,
        },
      });
      const res = await user.json();
      return res;
    },
  },
};
