**Format de chaque entrée dans le deidataset.csv :**
Id,Name,Surname,Division,Manager,Gender,Sexual_Orientation,LGBTQ,Indigenous,Ethnicity,Disability,Minority,Veteran,Date of Birth,Age,Preferred Name,Nationality,Hobbies,Pronouns,Mobile Number,Email,Aug_D_Q1,Aug_D_Q2,Aug_D_Q3,Aug_D_Q4,Aug_D_Q5,D_Negative,D_Neutral,D_Positive,Aug_E_Q1,Aug_E_Q2,Aug_E_Q3,Aug_E_Q4,Aug_E_Q5,E_Negative,E_Neutral,E_Positive,Aug_I_Q1,Aug_I_Q2,Aug_I_Q3,Aug_I_Q4,Aug_I_Q5,I_Negative,I_Neutral,I_Positive

**Explications des 15 questions questionnées dans le dataset :**

Aug_D_Q1 : Our company values diversity.
Aug_D_Q2 : Our company has a diverse workforce.
Aug_D_Q3 : Our company is taking actions to create a diverse workplace.
Aug_D_Q4 : I believe I can advance in my career regardless of my background. (e.g. gender, ethnicity,
etc.)
Aug_D_Q5 : Our company does not tolerate any incidents of discrimination.
Aug_E_Q1 : Our company values equity.
Aug_E_Q2 : I believe employees from different background are treated fairly in our company.
Aug_E_Q3 : Our company is committed to meeting the needs of employees with any kind of disability.
Aug_E_Q4 : I believe employees are compensated fairly regardless of their gender.
Aug_E_Q5 : Every employee has access to equal employment opportunities regardless of their
differences.
Aug_I_Q1 : Our company has an inclusive culture.
Aug_I_Q2 : I feel comfortable sharing my opinion even if it differs from the group.
Aug_I_Q3 : I feel valued for the contributions I can make to our company.
Aug_I_Q4 : Our company is taking actions to create an inclusive workplace.
Aug_I_Q5 : I feel a sense of belonging to our company.

**Réponses Possibles pour les questions précédentes :**
Strongly Disagree : -2
Disagree : -1
Neutral : 0
Agree : 1
Strongly Agree : 2

**Exemple of one entry :** 
1	Deborah	Addison	IT	No	Transgender	Heterosexual	Prefer not to say	No	White	Yes	No	No	1993-06-04	29	Deborah	Polish	Travelling	They/them/theirs	363 436 1096	Deborah.Addison@mail.ca	-1	2	-1	0	-2	3	1	1	0	-1	1	-2	1	2	1	2	0	1	1	0	-2	1	2	2



# Targets Questions (Questions Analyzed) :

**How is diversity represented within the company? (Visualization 1)**

1 What is the distribution of employees by gender, sexual orientation,ethnicity, etc.? ☆☆☆
2 Are certain groups underrepresented in specific departments or under certain managers? ☆☆
3 Does diversity vary by age or nationality? ☆
4 Which departments are the most diverse? ☆

**Do employees perceive diversity fairly? (Visualization 2)**

5 Are there significant differences in diversity scores (Aug_D_Qx) across genders? ☆☆☆
6 What about between ethnic groups, LGBTQ+ individuals, people with disabilities, or Indigenous employees? ☆☆☆
7 Which groups show the lowest diversity scores? ☆☆
8 Which departments receive the highest diversity scores? ☆

**Is equity perceived fairly across different groups? (Visualization 3)**

9 Which groups perceive the least equity (based on E_Negative scores)? ☆☆☆
10 Are there gaps in equity perception among disabled individuals, minorities, or non-veterans? ☆☆
11 Does perceived equity vary by division or manager? ☆

**Do all employees feel included on a daily basis? (Visualization 4)**

12 Do LGBTQ+ individuals feel included? ☆☆☆
13 Which groups show high I_Negative inclusion scores? ☆☆
14 Does perceived inclusion vary by pronouns used or cultural background?☆

**What actions can improve DEI in the company? (Visualization 5)**

15 Which groups experience multiple layers of marginalization (e.g., minority + LGBTQ + disability)? ☆☆☆
16 Which departments perform well despite high diversity? ☆☆
17 Can we identify targeted improvement levers from the results? ☆☆



