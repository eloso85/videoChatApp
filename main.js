//import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore'

import firebaseConfig from './config';

if(!firebase.apps.length){
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();


console.log(firebaseConfig)

const server = {
  iceServers: [
    {
      urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    },
  ],
  iceCandidatePoolSize: 10,
}
let pc = new RTCPeerConnection(server);
let localStream = null;
let remoteStream = null;

const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const anserwerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

//1. set up media source

webcamButton.onclick = async()=>{
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });//this will ask user for permissiont to use web cam 
  remoteStream = new MediaStream();

  //push tracks from local stream to peer connection
  localStream.getAudioTracks().forEach((track)=>{
    pc.addTrack(track, localStream);
  });

  // pull tracks from remote stream, add to video stream 
  pc.ontrack = event =>{
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteStream.srcObject = remoteStream;

}

//2 Create a offer

callButton.onclick = async () => {
  //reference Firestore collection
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value= callDoc.id;

  //Get candidates for caller, save to db

  pc.onicecandidate = event =>{
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  //create offer

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };
  await callDoc.set({ offer })

  //listen for remote answer

  callDoc.onSnapshot((onSnapshot)=>{
    const data = snapshot.data();
    if(!pc.currentRemoteDescription && data?.answer){
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });
  //when answered, add canidate to peer connection
  answerCandidates.onSnapshot(snapshot =>{
    snapshot.docChanges().forEach((change)=>{
      if(change.type === 'added'){
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    })
  })
}





