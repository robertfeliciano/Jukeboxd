import {posts, users} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import * as postFunctions from './posts.js';
import * as validation from '../validation.js';


const saltRounds = 16;

export const createUser = async (
    username,
    email,
    rawPassword,
    bio,
    profilePicture
) => {

    //input validation

    // TOOD EMAIL VAL SHOULD SET TO LOWER CASE

    const hashed = await bcrypt.hash(rawPassword, saltRounds);

    let newUser = {
        username:username,
        email:email,
        hashedPassword:hashed,
        userPosts:[],
        userComments:[],
        following:[],
        followers:[],
        bio:bio,
        profilePicture:profilePicture
    };

    const userCollection = await users();
    const dupes = await userCollection.find({emailAddress: email.toLowerCase()}).toArray();
    if (dupes.length > 0)
        throw `There is already a user with this email address.`;

    const insertInfo = await userCollection.insertOne(newUser);
    
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw 'Could not add user!';
    }

    const newId = insertInfo.insertedId.toString();
    const new_user = await getUserById(newId);
    
    return new_user;
}

export const getAllUsers = async () => {
    const userCollection = await users();
    
    let userList = await userCollection
        .find({})
        .project({_id : 1, username:1})
        .toArray();
    
    if (!userList) {
        throw 'Could not get all users';
    }

    return userList;
}

/**
 * gets the user information from teh db based on the id
 * @param userId
 * @returns {Promise<*>}
 */
export const getUserById = async (userId) => {
    
    //input validation

    const userCollection = await users();
    const user = await userCollection.findOne({_id: new ObjectId(userId)});

    if (user === null) {
        throw 'No user with that id';
    }

    return user;
}

/**
 * removes a user from the db
 * also removes all posts that the user created
 * and removes the user from their followers' following list
 * and removes the user from their followings' followers list
 * @param userId id of user to be removed
 * @returns {Promise<{deleted: boolean, userName}>}
 */
export const removeUser = async (userId) => {

    //input validation 

    const userCollection = await users();
    let user = await getUserById(userId);
    let user_name = user['username'];

    // find other users that follow this user
    // remove this user from their "following" list
    const id_to_remove = new ObjectId(userId);

    for (const following of user.followers) {
        const following_id = new ObjectId(following);
        await userCollection.findOneAndUpdate(
            {_id: following_id},
            {$pull: {following: id_to_remove}}
        )
    }

    for (const following of user.following) {
        const following_id = new ObjectId(following);
        await userCollection.findOneAndUpdate(
            {_id: following_id},
            {$pull: {followers: id_to_remove}}
        )
    }

    const postCollection = await posts();
    const posts_to_remove = await postCollection.find({user_id: id_to_remove}).project({_id:1}).toArray();
    for (const post of posts_to_remove) {
        const post_id = post._id;
        // this takes care of removing each post from the song it was posted under
        await postFunctions.removePost(post_id);
    }

    // finally... we delete the user
    const deletionInfo = await userCollection.findOneAndDelete({
        _id: new ObjectId(userId)
    });

    if (!deletionInfo) {
        throw [404, `Could not delete user with id of ${userId}`];
    }

    return {userName: user_name, deleted: true};
}

export const updateFollowers = async (user_to_update, new_follower_id) => {
    const userCollection = await users();
    const updated = await userCollection.findOneAndUpdate(
        {_id: new ObjectId(user_to_update)},
        {$push: {followers: new_follower_id}},
        {returnDocument: 'after'}
    );
    if (!updated) {
        throw [404, `Could not follow user with id of ${user_to_update}`];
    }
}

export const updateFollowing = async (user_to_update, new_following_id) => {
    const userCollection = await users();
    const updated = await userCollection.findOneAndUpdate(
        {_id: new ObjectId(user_to_update)},
        {$push: {following: new_following_id}},
        {returnDocument: 'after'}
    );
    if (!updated) {
        throw [404, `Could not follow user with id of ${user_to_update}`];
    }
}

export const updateUserPut = async (
    userId,
    userPost,
    userComment,
    friend
) => {

    //input validation 

    const userCollection = await users();
    let curr_user = await getUserById(userId);
    curr_user.userPosts.push(userPost);
    curr_user.userComments.push(userComment);
    curr_user.friends.push(friend);
    const updatedUser = {
        userPosts:curr_user.userPosts,
        userComments:curr_user.userComments,
        friends:curr_user.friends
    };

    const updatedInfo = await userCollection.findOneAndUpdate(
        {_id: new ObjectId(userId)},
        {$set: updatedUser},
        {returnDocument: 'after'}
    );

    if (!updatedInfo) {
        throw [404, 'Could not update user successfully'];
    }

    return updatedInfo;
}


/**
 *
 * @param userId
 * @param userInfo
 * @returns {Promise<*>}
 */
export const updateUserPatch = async (
    userId,
    userInfo
) => {
    
    //input validation

    const userCollection = await users();
    const updatedInfo = await userCollection.findOneAndUpdate(
        {_id: new ObjectId(userId)},
        {$set: userInfo},
        {returnDocument: 'after'}
    );
    
    if (!updatedInfo) {
        throw [404, 'Could not update user successfully'];
    }

    return updatedInfo;
}


/**
 * This function will be called when a user submits the login form
 * @param emailAddress email of user
 * @param password password of user
 * @returns {Promise<{hashedPassword: *, email: *, username}>}
 */
export const loginUser = async (emailAddress, password) => {
    // input validation

    const db = await users();
    const user = await db.findOne({emailAddress: emailAddress.toLowerCase()});
    if (user === null) throw `Either the email address or password is invalid`;
    let comp = await bcrypt.compare(password, user.password);
    if (comp)
        return {
            username: user.username,
            email: user.email,
            hashedPassword: user.hashedPassword
        };
    else
        throw `Either the email address or password is invalid`;
}