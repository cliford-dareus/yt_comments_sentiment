"use server"

const getComments = async (videoId: {videoId: string}) => {
  try {
    const data = await fetch('http://localhost:3000/api/youtube-comments', {
      method: 'POST',
      body: JSON.stringify(videoId)
    })
    const response = await data.json()
    return response
  } catch (error) {
    console.log("Something went wrong")
  }
};

export default getComments;