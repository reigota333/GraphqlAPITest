const { gql } = require('apollo-server');

const typeDefs = gql`
  
  type Query {
    currentUser: User!
    users: [User!]!
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): User!
    login(email: String!, password: String!): LoginResponse!
    createClub(name: String!, email: String!, city: String!): Club!
    joinClub(email: String!): UserClub!
    leaveClub: User!
    addFriend(email: String!): Friend!
    deleteFriend(id: ID!): User!
    sendMessage(id: ID!, message: String!): Message!
    createChatRoom: ChatRoom!
  }

  type Subscription {
    readChatRoom(id: ID!): Message!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    userClub: UserClub
    friends: [Friend!]!
    chatRooms: [ChatRoom!]!
  }

  type LoginResponse{
    token: String!
    user: User!
  }

  type UserClub {
  id: ID!
  user: User!
  club: Club!
}

  type Club {
    id: ID! 
    name: String!
    userClub: [UserClub]
    email: String!
    city: String!
  }

  type Friend {
  id: ID! 
  user1: User!
  user1ID: ID!
  user2: User! 
  user2ID: ID!
}


type ChatRoom {
  id: ID!
  users: [User!]!
}

type Chat {
  id: ID! 
  user: User! 
  chatRoom: ChatRoom!
  message: [Message!]!
}

type Message {
  id: ID!
  user: User! 
  chatRoom: ChatRoom!
  message: String!
}

`;

module.exports = typeDefs;
