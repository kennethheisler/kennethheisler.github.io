
# The server file
function(input, output) {
    
    observe({
        # get the file typed in from the user
        data_file = input$file
        if (is.null(data_file)) {
            return(NULL)
        }
        # read in the file
        data = read.csv(data_file$datapath)
        # render the histogram in this function
        output$main_plot <- renderPlot({
            
            hist(data$Score,
                 probability = TRUE,
                 breaks = as.numeric(input$n_breaks),
                 xlab = "Scores",
                 main = paste(data_file$name,"Exam Scores Distribution")
                 )
            # add the density line if selected
            if (input$density) {
                dens <- density(data$Score,
                                adjust = input$bw_adjust)
                lines(dens, col = "blue")
            }
        })
        
        # get the file typed in from the user
        data_file.2 = input$file2
        if (is.null(data_file.2)) {
          return(NULL)
        }
        # read in the file
        data.2 = read.csv(data_file.2$datapath) 
        output$main_plot.2 <- renderPlot({
          
          hist(data.2$Score,
               probability = TRUE,
               breaks = as.numeric(input$n_breaks),
               xlab = "Scores",
               main = paste(data_file.2$name,"Exam Scores Distribution")
          )
          # add the density line if selected
          if (input$density) {
            dens <- density(data.2$Score,
                            adjust = input$bw_adjust)
            lines(dens, col = "red")
          }
        })
    })
}



