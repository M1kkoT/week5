import {GraphQLError} from 'graphql';
import {Cat, CatTest} from '../../interfaces/Cat';
import {locationInput} from '../../interfaces/Location';
import {User, UserIdWithToken} from '../../interfaces/User';
import rectangleBounds from '../../utils/rectangleBounds';
import catModel from '../models/catModel';
import {Types} from 'mongoose';
import LoginMessageResponse from '../../interfaces/LoginMessageResponse';
import jwt from 'jsonwebtoken';
import {type} from 'os';

// TODO: create resolvers based on cat.graphql
// note: when updating or deleting a cat, you need to check if the user is the owner of the cat
// note2: when updating or deleting a cat as admin, you need to check if the user is an admin by checking the role from the user object
export default {
  Cat: {
    owner: async (parent: Cat) => {
      const owner: User | Types.ObjectId = parent.owner;
      const stringId: string = (owner as User).id;
      if (typeof stringId !== 'string') {
        const newOwner = (owner as Types.ObjectId).toString();
        const user = await fetch(
          process.env.AUTH_URL + '/users/' + newOwner,
          {}
        );
        const message = await user.json();
        return message.data as User;
      }
      const user = await fetch(process.env.AUTH_URL + '/users/' + stringId, {});
      const message = await user.json();
      return message.data as User;
    },
  },
  Query: {
    cats: async () => {
      const array = await catModel.find();
      return array;
    },
    catById: async (parent: undefined, args: {id: string}) => {
      return await catModel.findById(args.id);
    },
    catsByOwner: async (_: undefined, args: {owner: string}) => {
      return await catModel.find({owner: args.owner});
    },
    catsByArea: async (_: undefined, args: locationInput) => {
      const box = rectangleBounds(args.topRight, args.bottomLeft);
      return await catModel.find({
        location: {
          $geoWithin: {
            $geometry: box,
          },
        },
      });
    },
  },
  Mutation: {
    createCat: async (
      _parent: undefined,
      args: Cat,
      contextValue: UserIdWithToken
    ) => {
      const newCat = new catModel(args);
      newCat.owner = new Types.ObjectId((contextValue as UserIdWithToken).id);
      const saveCat = await newCat.save();
      return saveCat;
    },
    updateCat: async (
      _parent: undefined,
      args: {id: string; cat_name: string; weight: number; birthdate: Date},
      contextValue: UserIdWithToken
    ) => {
      const cat = await catModel.findById(args.id);
      if (!cat) {
        throw new GraphQLError('Cat not found');
      }
      if (cat.owner.toString() !== contextValue.id) {
        throw new GraphQLError('Not authorized');
      }
      return await catModel.findByIdAndUpdate(args.id, args as Cat, {
        new: true,
      });
    },
    deleteCat: async (
      _parent: undefined,
      args: {id: string},
      contextValue: UserIdWithToken
    ) => {
      const cat = await catModel.findById(args.id);
      if (!cat) {
        throw new GraphQLError('Cat not found');
      }
      if (cat.owner.toString() !== contextValue.id) {
        throw new GraphQLError('Not authorized');
      }
      return await catModel.findByIdAndDelete(args.id);
    },
    updateCatAsAdmin: async (
      _parent: undefined,
      args: Cat,
      contextValue: UserIdWithToken
    ) => {
      if (contextValue.role !== 'admin') {
        throw new GraphQLError('Not authorized');
      }
      const res = await catModel.findByIdAndUpdate((args as Cat).id, args, {
        new: true,
      });
      console.log('RES', res);
      return res;
    },
    deleteCatAsAdmin: async (
      _parent: undefined,
      args: {id: string},
      contextValue: UserIdWithToken
    ) => {
      if (contextValue.role !== 'admin') {
        throw new GraphQLError('Not authorized');
      }
      return await catModel.findByIdAndDelete(args.id);
    },
  },
};
