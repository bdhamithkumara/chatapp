import React, { useState, useEffect } from 'react';
import './App.css'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihtssavgunaywaeqjthv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodHNzYXZndW5heXdhZXFqdGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc0MzQ4MDQsImV4cCI6MjAxMzAxMDgwNH0.430HEoSzGqB4RKv2fbboDb6sQTQBMgQNimKKPcxnVTs'
const supabase = createClient(supabaseUrl, supabaseKey)

function App() {

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username , setUsername] = useState()

  useEffect(() => {
    getUsername();
    getMessages()
    chnages();
  }, []);

  const getUsername = () => {
    const previousUsername = localStorage.getItem("username");
    if (previousUsername) {
      setUsername(previousUsername)
    } else {
      const username_generate = `person_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem("username", username_generate);
      setUsername(username_generate)
    }

  };
  //working
  const getMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select()
      .order("timestamp", { ascending: true });
      console.log(data)
      setMessages(data)
    return data;
  };

const chnages = () =>{

  try {

    const message_s = supabase.channel('custom-insert-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
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
const roomOne = supabase.channel('custom-channel')
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
const channel = supabase.channel('custom-channel')
channel
  .on('presence', { event: 'sync' }, () => {
   // console.log('Synced presence state: ', channel.presenceState())
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() })
    }
  })
//

const createNewMessage = async (username, text) => {
  if (text) {
    await supabase.from("messages").insert({ username, text });
    setNewMessage('');
    chnages();
    getMessages();
  }
    
}
  return (
    <>
    <div className="flex flex-col h-screen">
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.map((message, index) => (
        <div
        key={index}
        className={`mb-4 ${
          message.username === username ? 'bg-green-200 border border-green-500' : 'bg-gray-200 border border-gray-500'
        } rounded-lg p-2 max-w-2/3 self-${
          message.username === username ? 'end' : 'start'
        }`}
      >
        <div className="text-gray-600 m-2">
          {message.username}:{message.text}
        </div>
      </div>
      ))}
    </div>

      <input
        type="text"
        placeholder="Type your message..."
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        className="w-full p-2 rounded-lg border"
      />
      <button onClick={() => createNewMessage(username,newMessage)} className="mt-2 bg-blue-500 text-white rounded-lg p-2">
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
