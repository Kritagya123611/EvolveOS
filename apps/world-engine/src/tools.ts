//The Architecture of a Syscall
//The Declaration: We tell the LLM, "You have a tool called runTerminalCommand and another 
// called writeFile. Here is what they do."

//The Decision: The LLM reads the human task. Instead of responding with text, it responds 
// with a JSON object saying, "Stop thinking. Trigger runTerminalCommand with the argument 
// mkdir test-dir."

//The Execution: Your Node server catches this JSON, actually runs the command on your 
// Ubuntu machine, grabs the terminal output, and sends it back to the LLM saying, 
// "Here is what happened. What next?"

