import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css'

import { createClient } from '@supabase/supabase-js'

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const supabaseUrl = 'https://ihtssavgunaywaeqjthv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodHNzYXZndW5heXdhZXFqdGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc0MzQ4MDQsImV4cCI6MjAxMzAxMDgwNH0.430HEoSzGqB4RKv2fbboDb6sQTQBMgQNimKKPcxnVTs'
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState()
  const roomOne = supabase.channel('custom-channel')
  const channelRef = useRef(null);

  const [isTyping, setIsTyping] = useState(false);
  const [payload, setPayload] = useState(null);

  const [selectedFile, setSelectedFile] = useState('null');

  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    getUsername();
    getMessages()
    chnages();
    setupTypingChannel();
  }, []);

  // Setup the typing indicator channel
  const setupTypingChannel = () => {
    const typingChannel = supabase.channel('typing'); // Use a separate channel for typing indicators

    typingChannel.on('broadcast', { event: 'typing' }, (payload) => {
      setPayload(payload);
      setIsTyping(true);
      hideTypingIndicator();
    });

    const subscription = typingChannel.subscribe();
    channelRef.current = typingChannel;

    return () => {
      subscription.unsubscribe();
    };
  };

  const hideTypingIndicator = () => {
    setTimeout(() => setIsTyping(false), 2000);
  };

  //create the username for users
  const getUsername = () => {
    const previousUsername = localStorage.getItem("username");
    if (previousUsername) {
      setUsername(previousUsername)
    } else {
      const username_generate = `person_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("username", username_generate);
      setUsername(username_generate)
    }
  }
  //working get the all messages
  const getMessages = async () => {

    const query = supabase
      .from("messages")
      .select()
      .order("timestamp", { ascending: true });

    if (lastMessageTimestamp) {
      query.gt("timestamp", lastMessageTimestamp);
    }

    const { data } = await query;

    if (data.length > 0) {
      setLastMessageTimestamp(data[data.length - 1].timestamp);
    }

    setMessages([...messages, ...data]);

    return data;
  };

  //this for realtime
  const chnages = () => {
    try {
      const message_s = supabase.channel('custom-insert-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            console.log('Change received!', payload)
            
              getMessages();
            
          }
        )
        .subscribe()
    } catch (error) {
      console.log(error)
    }
  }

  // You can use it to show an "online" status

  const userStatus = {
    user: username,
    online_at: new Date().toISOString(),
  }

  roomOne.subscribe(async (status) => {
    if (status !== 'SUBSCRIBED') { return }
    const presenceTrackStatus = await roomOne.track(userStatus)
    // console.log(presenceTrackStatus , userStatus)
  })

  // 
  // const channel = supabase.channel('custom-channel')
  // channel
  //   .on('presence', { event: 'sync' }, () => {
  //     // console.log('Synced presence state: ', channel.presenceState())
  //   })
  //   .subscribe(async (status) => {
  //     if (status === 'SUBSCRIBED') {
  //       await channel.track({ online_at: new Date().toISOString() })
  //     }
  //   })
  //

  // when the user enter message that will go to the supabase
  const createNewMessage = async (username, text, selectedFile) => {
    
    setSelectedFile(null); 
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (text) {
      insertToDatabase(username, text, null, null);
    }
    else if (selectedFile) {
      // If a file is selected, handle the image upload.
      const { error } = await supabase.storage
        .from('forfiles/chatdatafiles')
        .upload(selectedFile.name, selectedFile);

      if (error) {
        // Handle the error, e.g., show an error message to the user.
        console.log("Error uploading file: " + error.message);
        return;
      }

      const { data: imageData, error: getImageError } = await supabase.storage
        .from('forfiles/chatdatafiles')
        .getPublicUrl(selectedFile.name);

      if (getImageError) {

        console.log("Error getting image URL: " + getImageError.message);
        return;
      }
      const image_url = imageData.publicUrl;
      const extention = selectedFile.name.split('.').pop();
      insertToDatabase(username, text, image_url, extention);
    } else if (!text && !selectedFile) {
      console.log("Please enter a message or choose a file.");
      return;
    }

  };

  const insertToDatabase = async (username, text, image_url, extention) => {
    await supabase.from("messages").insert({ username, text, image_url, extention });
    setSelectedFile(null);
    setNewMessage('');
    chnages();
    getMessages();
  }

  const catchTheTyping = () => {
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { username },
    });
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.map((message) => {
            return (
              <div
                key={message.id}
                className={`mb-4 ${message.username === username
                  ? 'bg-green-200 border border-green-500'
                  : 'bg-gray-200 border border-gray-500'
                  } rounded-lg p-2 max-w-2/3 self-${message.username === username ? 'end' : 'start'
                  }`}
              >
                <div className="text-gray-600 m-2">
                  timestamp - {message.timestamp} <br />
                  username - {message.username} <br />
                  message - {message.text} <br />
                  file extension - {message.extention}
                  {message.image_url && (  // Check if message.image_url is available
                    <div className="w-[300px] h-[300px]">
                      <DocViewer documents={[{ uri: message.image_url }]} pluginRenderers={DocViewerRenderers} 
                      config={{
                        header: {
                          disableHeader: false,
                          disableFileName: false,
                          retainURLParams: false,
                        },
                        csvDelimiter: ",", // "," as default,
                        pdfZoom: {
                          defaultZoom: 1.1, // 1 as default,
                          zoomJump: 0.2, // 0.1 as default,
                        },
                        pdfVerticalScrollByDefault: true, // false as default
                        loadingRenderer: {
                          showLoadingTimeout: false, // false if you want to disable or number to provide your own value (ms)
                        },
                      }}
                      theme={{
                        primary: "#5296d8",
                        secondary: "#ffffff",
                        tertiary: "#5296d899",
                        textPrimary: "#ffffff",
                        textSecondary: "#5296d8",
                        textTertiary: "#00000099",
                        disableThemeScrollbar: false,
                      }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          {isTyping && (
            <div className="mb-4 bg-blue-200 border border-blue-500 rounded-lg p-2 max-w-2/3 self-start">
              <div className="text-gray-600 m-2">Someone is typing...</div>
            </div>
          )}
        </div>
        <input
          type="file"
          onChange={(e) => {
            setSelectedFile(e.target.files[0]);
          }}
          ref={fileInputRef}
          className="w-full p-2 rounded-lg border"
        />
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value)
            catchTheTyping()
          }}
          className="w-full p-2 rounded-lg border"
        />
        <button onClick={() => createNewMessage(username, newMessage, selectedFile)} className="mt-2 bg-blue-500 text-white rounded-lg p-2">
          Send
        </button>
        <div>
          my user name -  {userStatus.user}
        </div>

      </div>
    </>
  )
}

export default App
