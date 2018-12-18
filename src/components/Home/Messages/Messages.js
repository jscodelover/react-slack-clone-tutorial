import * as React from "react";
import { connect } from "react-redux";
import { Segment, Comment } from "semantic-ui-react";
import MessageHeader from "./MessageHeader";
import MessageForm from "./MessageForm";
import firebase from "../../../firebaseConfig";
import Message from "./Message";
import "./Messages.css";

class Messages extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messageRef: firebase.database().ref("messages"),
      userRef: firebase.database().ref("users"),
      messages: [],
      usersInChannel: [],
      searchMsg: [],
      searchLoading: false
    };
  }

  componentDidMount() {
    this.fetchMessage();
  }

  //TODO: when we include personal user chat -> Edit userCount.
  componentDidUpdate(prevProps) {
    if (prevProps.channel.channelName !== this.props.channel.channelName) {
      this.fetchMessage();
    }
  }

  fetchMessage = () => {
    const { messageRef, userRef } = this.state;
    const { channel } = this.props;
    let loadedMessage = [];
    messageRef.once("value", snap => {
      if (snap.hasChild(channel.id)) {
        messageRef.child(channel.id).on("child_added", snapMsg => {
          userRef.child(snapMsg.val().userID).once("value", snapUser => {
            loadedMessage.push({
              ...snapMsg.val(),
              user: { ...snapUser.val() }
            });
            this.setState({ messages: loadedMessage });
            this.userCount(loadedMessage);
          });
        });
      } else {
        this.setState({ messages: [] });
        this.userCount(loadedMessage);
      }
    });
  };

  userCount = messages => {
    if (messages.length) {
      let users = messages.reduce((userArray, msg) => {
        if (!userArray.includes(msg.user.username))
          return userArray.concat(msg.user.username);
        return userArray;
      }, []);
      this.setState({ usersInChannel: users });
    } else {
      this.setState({ usersInChannel: "" });
    }
  };

  displayMessages = (messages, user) =>
    messages.length > 0 &&
    messages.map(msg => {
      return <Message msg={msg} key={msg.timestamp} user={user} />;
    });

  //TODO: include search on complete message database --> (using channelIDs for this)
  searchMessage = searchInput => {
    const { messages } = this.state;
    let regxExp = new RegExp(searchInput, "gi");
    this.setState({ searchLoading: true });
    let searchMsg = messages.reduce((acc, msg) => {
      if (
        (msg.hasOwnProperty("content") && msg["content"].match(regxExp)) ||
        msg.user.username.match(regxExp)
      ) {
        acc.push(msg);
      }
      return acc;
    }, []);
    this.setState({ searchMsg });
    setTimeout(() => {
      this.setState({ searchLoading: false });
    }, 1000);
  };

  metaData = () => {
    const { channelIDs, channel } = this.props;
    const { usersInChannel, userRef } = this.state;
    if (channelIDs.includes(channel.id)) {
      return usersInChannel;
    } else {
      let userID = channel["id"].match(new RegExp(/[a-z A-Z 0-9]+,/, "g"));
      let id = userID[0].match(new RegExp(/[a-z A-Z 0-9]+/, "g"));
      let user = {};
      console.log(id[0]);
      userRef.child(id[0]).once("value", snap => {
        user = snap.val();
      });
      return user;
    }
  };

  render() {
    const { messageRef, messages, searchMsg, searchLoading } = this.state;
    const { channel, user, privateChannel } = this.props;
    return (
      <React.Fragment>
        <MessageHeader
          channelName={channel.channelName}
          metaData={this.metaData()}
          searchMessage={data => {
            this.searchMessage(data);
          }}
          searchLoading={searchLoading}
          privateChannel={privateChannel}
        />
        <Segment className="messages">
          <Comment.Group size="large">
            {searchMsg.length > 0
              ? this.displayMessages(searchMsg, user)
              : this.displayMessages(messages, user)}
          </Comment.Group>
        </Segment>
        <MessageForm messageRef={messageRef} channel={channel} user={user} />
      </React.Fragment>
    );
  }
}

const mapStateToProps = ({ user, channel }) => {
  return {
    user: user.currentUser,
    channel: channel.currentChannel,
    channelIDs: channel.channelIDs,
    privateChannel: channel.privateChannel
  };
};

export default connect(mapStateToProps)(Messages);
