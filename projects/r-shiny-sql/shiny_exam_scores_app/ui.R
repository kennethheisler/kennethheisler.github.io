
# The user interface
fluidPage(
 
    # Application title
    titlePanel("Exam Score Distributions"),
    
    sidebarLayout(
      
      sidebarPanel(
        selectInput(inputId = "n_breaks",
                    label = "Number of bins in histogram (approximate):",
                    choices = c(10, 20, 35, 50),
                    selected = 20),
        tags$hr(),
        
        checkboxInput(inputId = "density",
                      label = strong("Show density estimate"),
                      value = FALSE),
        
        tags$hr(),
        conditionalPanel(condition = "input.density == true",
                         sliderInput(inputId = "bw_adjust",
                                     label = "Bandwidth adjustment:",
                                     min = 0.2, max = 2, value = 1, step = 0.2))),
      
      
      mainPanel( 
      
    # File Chooser
    fileInput('file', 'Select the exam csv file',
              accept=c('text/csv','text/comma-separated-values,text/plain','.csv')),
    
    
    
    
    # where the plot will be rendered
    plotOutput(outputId = "main_plot", height = "300px"),
 
    
    ##############
 
    tags$hr(),
    fileInput('file2', 'Select the exam csv file',
              accept=c('text/csv','text/comma-separated-values,text/plain','.csv')),
    
    plotOutput(outputId = "main_plot.2", height = "300px"),
      )
   
    )
    
)

