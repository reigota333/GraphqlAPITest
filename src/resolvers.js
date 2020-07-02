const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { subscribe } = require('graphql')

const resolvers = {

  //QUERYS

  Query: {

    //CHECK IF USER IS LOGGED IN

    currentUser: (parent, args, { user, prisma }, info) => {
      if (!user) {
        throw new Error('Not Authenticated')
      }
      return prisma.user({ id: user.id })
    },

    //GET ALL USERS

    users: async (parent, args, { user, prisma }, info) => {
      return prisma.users()
    },

  },

  // MUTATIONS

  Mutation: {

    //REGISTER A USER

    register: async (parent, { username, password, email }, ctx, info) => {
      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await ctx.prisma.createUser({
        username,
        email,
        password: hashedPassword,
      })
      return user
    },

    //LOGIN A USER

    login: async (parent, { email, password }, ctx, info) => {
      const user = await ctx.prisma.user({ email })

      if (!user) {
        throw new Error('Invalid Login')
      }

      const passwordMatch = await bcrypt.compare(password, user.password)

      if (!passwordMatch) {
        throw new Error('Invalid Login')
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
        },
        'reigota',
        {
          expiresIn: '30d', // token will expire in 30days
        },
      )
      return {
        token,
        user,
      }
    },

    //CREATE A CLUB

    createClub: async (parent, { name, email, city }, { user, prisma }, info) => {
      const club = await prisma.createClub({
        name,
        email,
        city
      })
      return club
    },

    //JOIN CLUB

    joinClub: async (parent, { email }, { user, prisma }, info) => {
      if (!user) {
        throw new Error('User not Logged in')
      }

      const club = await prisma.club({ email })

      if (!club) {
        throw new Error('Club not Found')
      }

      const user2 = await prisma.user({ id: user.id })

      const joinClub = await prisma.createUserClub({
        user: {
          connect: {
            id: user2.id
          }
        },
        userID: user2.id,
        club: {
          connect: {
            id: club.id
          }
        },
        clubID: club.id
      }, info)

      console.log(joinClub)
      return joinClub
    },


    //LEAVE CLUB

    leaveClub: async (parent, args, { user, prisma }, info) => {
      if (!user) {
        throw new Error('Not Authorized')
      }

      const user1 = await prisma.user({ id: user.id })

      const userClub = await prisma.user({ id: user.id }).userClub()

      if (!userClub) {
        throw new Error('User is not in a club')
      }

      try {
        await prisma.deleteUserClub({ id: userClub.id })
      } catch (err) {
        throw new Error(err)
      }

      return user1
    },


    //ADD A FRIEND

    addFriend: async (parent, { email }, { user, prisma }, info) => {

      if (!user) {
        throw new Error("Not logged in")
      }

      const user1 = await prisma.user({ id: user.id })
      const user2 = await prisma.user({ email })

      if (!user2) {
        throw new Error('User was not Found')
      }

      const friend = await prisma.createFriend({
        user1: {
          connect: {
            id: user1.id
          },
        },
        user1ID: user1.id,
        user2: {
          connect: {
            id: user2.id
          }
        },
        user2ID: user2.id
      }, info)

      console.log(friend)
      return friend
    },


    //DELETE FRIEND

    deleteFriend: async (parent, { id }, { user, prisma }, info) => {
      if (!user) {
        throw new Error('User is not Logged in')
      }

      if (!(await prisma.friend({ id }))) {
        throw new Error('Error Deleting friendship')
      }

      const user1 = await prisma.user({ id: user.id })

      try {
        await prisma.deleteFriend({ id })
        return user1
      } catch (err) {
        throw new Error(err)
      }

    },


    //SEND MESSAGE TO CHAT

    sendMessage: async (parent, { id, message }, { user, prisma, pubsub }, info) => {
      if (!user) {
        throw new Error('User is not Logged In')
      }
      const room = await prisma.user({ id: user.id }).chatRooms()

      const roomID = room.filter(rooms => {
        return rooms.id === id
      });

      if (roomID.length == 0) {
        throw new Error('You are not in this Room')
      }

      try {
        const messages = await prisma.createMessage({
          user: {
            connect: {
              id: user.id
            }
          },
          message,
          chatRoom: {
            connect: {
              id
            }
          }
        })


        console.log(messages)

        pubsub.publish('chatRoom' + id, {  readChatRoom: messages  })
        return messages

      } catch (err) {
        throw new Error(err)
      }
    },

    //CREATE CHAT ROOM

    createChatRoom: async (parent, args, { user, prisma, pubsub }, info) => {
      if (!user) {
        throw new Error('User not Logged In')
      }

      const userChat = await prisma.user({ id: user.id })

      try {
        return await prisma.createChatRoom({
          users: {
            connect: {
              id: userChat.id
            }
          }
        })
      } catch (err) {
        throw new Error(err)
      }
    }



  },

  //SUBSCRIPTIONS

  Subscription: {

    //READ CHAT ROOM 

    readChatRoom: {
      subscribe: async (parent, { id }, { user, prisma, pubsub }, info) => {
        return pubsub.asyncIterator('chatRoom' + id)
      }
    }
  },

  //MESSAGE RELATIONS

  Message: {

    //MESSAGE - USER RELATIONSHIP 

    user: async (parent, args, { prisma }, info) => {
      return await prisma.message({ id: parent.id }).user()
    },

    //MESSAGE - CHATROOM RELATIONSHIP

    chatRoom: async (parent, args, { prisma }, info) => {
      return await prisma.message({ id: parent.id }).chatRoom()
    }

  },

  //CHATROOM RELATIONS  

  ChatRoom: {

    //CHATROOM - USER RELATIONSHIP

    users: async (parent, args, { prisma }, info) => {
      return await prisma.chatRoom({ id: parent.id }).users()
    }
  },

  //USER RELATIONS

  User: {

    //USER - CLUB RELATIONSHIP

    userClub: async (parent, args, { user, prisma }, info) => {
      return await prisma.user({ id: parent.id }).userClub()
    },

    //USER - FRIEND RELATIONSHIP

    friends: async (parent, args, { user, prisma }, info) => {
      return await prisma.user({ id: parent.id }).friends()
    },

    //USER - CHATROOM RELATIONSHIP

    chatRooms: async (parent, args, { prisma }, info) => {
      return await prisma.user({ id: parent.id }).chatRooms()
    }
  },

  //CLUB RELATIONS

  Club: {

    //CLUB - USER RELATIONSHIP

    userClub: async (parent, args, { user, prisma }, info) => {
      return await prisma.club({ id: parent.id }).userClubs()
    }
  },

  //USERCLUB RELATIONS

  UserClub: {

    //USERCLUB - USER RELATIONSHIP

    user: async (parent, args, { user, prisma }, info) => {
      return await prisma.userClub({ id: parent.id }).user()
    },

    //USERCLUB - CLUB RELATHIONSHIP

    club: async (parent, args, { user, prisma }, info) => {
      return await prisma.userClub({ id: parent.id }).club()
    }
  },

  //FRIEND RELATIONS

  Friend: {

    //FRIEND - USER1 RELATIONSHIP

    user1: async (parent, args, { user, prisma }, info) => {
      return await prisma.friend({ id: parent.id }).user1()
    },

    //FRIEND - USER2 RELATIONSHIP

    user2: async (parent, args, { user, prisma }, info) => {
      return await prisma.friend({ id: parent.id }).user2()
    }

  }

}

module.exports = resolvers