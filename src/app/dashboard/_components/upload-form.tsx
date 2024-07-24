'use client'

import { Button } from "@/components/ui/button";
import { useState } from "react"
import getComments from "../_actions/get-comments";

const YtUploadForm = () => {
  const [comment, setComment] = useState();
  
  const postComments = async (e: any) => {
    e.preventDefault()
    const comments = await getComments()
    console.log(comments)
  }
  
  return(
    <div className="">
      <form onSubmit={(e) => postComments(e)}>
        
        <Button>Fetch</Button>
      </form>
    </div>
  )
}

export default YtUploadForm;