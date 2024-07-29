import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import YtUploadForm from "./upload-form";


const CreateProjectDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New Project</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a new project</DialogTitle>
          <DialogDescription>
            Enter the youtube url you want to analyze.
          </DialogDescription>
        </DialogHeader>
        <YtUploadForm />
      </DialogContent>
    </Dialog>
  )
};

export default CreateProjectDialog;